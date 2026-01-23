# -------------------------------
# OpenShift Web Terminal E2E Tests
# -------------------------------
-include .env

# Configuration
DOCKER_IMAGE := mcr.microsoft.com/playwright:v1.57.0-jammy

# Optional: Set TEST_FILE environment variable to run a specific test file.
# Example: make test TEST_FILE=tests/example.spec.js
TEST_FILE ?=

# Logs and Directory Setup
LOG_DIR := playwright_logs
LOG_DIR_CONTAINER := /app/$(LOG_DIR) # Path inside the container

# -------------------------------
# Local Installation (host machine)
# -------------------------------
.PHONY: install
install:
	@if [ ! -d "node_modules" ]; then \
		echo "Installing Node dependencies locally..."; \
		npm install playwright @playwright/test; \
	else \
		echo "Node modules already exist, skipping install."; \
	fi

# -------------------------------
# Run tests locally
# -------------------------------
.PHONY: test
test: install
	@echo "Running Playwright tests locally..."
	@echo "Logs will be saved in: $(LOG_DIR)"
	@mkdir -p $(LOG_DIR)
	CONSOLE_URL=$(CONSOLE_URL) \
	KUBEADMIN_USERNAME=$(KUBEADMIN_USERNAME) \
	EXPECTED_KUBEADMIN_WHOAMI_OUTPUT=$(EXPECTED_KUBEADMIN_WHOAMI_OUTPUT) \
	KUBEADMIN_PASSWORD=$(KUBEADMIN_PASSWORD) \
	WEB_TERMINAL_NAMESPACE=$(ADMIN_WEB_TERMINAL_NAMESPACE) \
	TEST_MODE=admin \
	USER_PROVIDER=$(DEFAULT_PROVIDER) \
	PLAYWRIGHT_HEADLESS=$(PLAYWRIGHT_TESTS_HEADLESS) \
	npx playwright test --project=web-terminal-chromium $(TEST_FILE) --reporter=list --output=$(LOG_DIR)
	@echo "E2E tests completed. Logs and report saved in $(LOG_DIR)"

.PHONY: test-user
test-user: install
	@echo "Running Playwright tests locally..."
	@echo "Logs will be saved in: $(LOG_DIR)"
	@mkdir -p $(LOG_DIR)
	@oc new-project $(USER_WEB_TERMINAL_NAMESPACE) || true
	CONSOLE_URL=$(CONSOLE_URL) \
	TEST_MODE=user \
	TEST_USER=$(CLUSTER_USER) \
	USER_PASSWORD=$(CLUSTER_USER_PASSWORD) \
	USER_PROVIDER=$(USER_PROVIDER) \
	WEB_TERMINAL_NAMESPACE=$(USER_WEB_TERMINAL_NAMESPACE) \
	PLAYWRIGHT_HEADLESS=$(PLAYWRIGHT_TESTS_HEADLESS) \
	npx playwright test --project=web-terminal-chromium $(TEST_FILE) --reporter=list --output=$(LOG_DIR)
	@echo "E2E tests completed. Logs and report saved in $(LOG_DIR)"

# -------------------------------
# Run tests inside Docker
# -------------------------------
.PHONY: test-docker
test-docker:
	@echo "Running Playwright tests inside Docker..."
	@echo "Logs will be saved in: $(LOG_DIR)"
	@mkdir -p $(LOG_DIR)
	docker run --rm \
		-v $$(pwd):/app \
		-w /app \
                -e CONSOLE_URL=$(CONSOLE_URL) \
                -e KUBEADMIN_USERNAME=$(KUBEADMIN_USERNAME) \
                -e EXPECTED_KUBEADMIN_WHOAMI_OUTPUT=$(EXPECTED_KUBEADMIN_WHOAMI_OUTPUT) \
                -e KUBEADMIN_PASSWORD=$(KUBEADMIN_PASSWORD) \
                -e WEB_TERMINAL_NAMESPACE=$(ADMIN_WEB_TERMINAL_NAMESPACE) \
                -e TEST_MODE=admin \
                -e USER_PROVIDER=$(DEFAULT_PROVIDER) \
                -e PLAYWRIGHT_HEADLESS=true \
		$(DOCKER_IMAGE) \
		bash -c "\
			npm install playwright @playwright/test && \
			npx playwright install --with-deps && \
			npx playwright test --project=web-terminal-chromium $(TEST_FILE) --reporter=list --output=$(LOG_DIR_CONTAINER) \
		"
	@echo "E2E tests completed. Logs and report saved in $(LOG_DIR)"

# -------------------------------
# Run DevWorkspace VS Code UI test
# -------------------------------
.PHONY: test-dwo-editor
test-dwo-editor: install
	@echo "Running DevWorkspace VS Code UI test..."
	@mkdir -p $(LOG_DIR)
	PLAYWRIGHT_HEADLESS=$(PLAYWRIGHT_TESTS_HEADLESS) \
	npx playwright test --project=vscode-web-chromium --reporter=list --output=$(LOG_DIR)
	@echo "DevWorkspace VS Code UI test completed. Logs saved in $(LOG_DIR)"

