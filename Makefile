# -------------------------------
# OpenShift Web Terminal E2E Tests
# -------------------------------

# Configuration
DOCKER_IMAGE := mcr.microsoft.com/playwright:v1.57.0-jammy

# Optional: Set TEST_FILE environment variable to run a specific test file.
# Example: make test TEST_FILE=tests/example.spec.js
TEST_FILE ?=

# Logs and Directory Setup
LOG_DIR := playwright_logs
LOG_DIR_CONTAINER := /app/$(LOG_DIR) # Path inside the container

# Hardcoded Credentials
CONSOLE_URL_HARDCODED := https://console-openshift-console.apps-crc.testing
KUBEADMIN_USERNAME_HARDCODED := kubeadmin
KUBEADMIN_PASSWORD_HARDCODED := secret

# Test user
CLUSTER_USER := user1
CLUSTER_PASS := test
USER_PROVIDER := my_htpasswd_provider

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
	CONSOLE_URL=$(CONSOLE_URL_HARDCODED) \
	KUBEADMIN_USERNAME=$(KUBEADMIN_USERNAME_HARDCODED) \
	KUBEADMIN_PASSWORD=$(KUBEADMIN_PASSWORD_HARDCODED) \
	TEST_USER=$(CLUSTER_USER) \
	USER_PASSWORD=$(CLUSTER_PASS) \
	USER_PROVIDER=$(USER_PROVIDER) \
	PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
	npx playwright test $(TEST_FILE) --reporter=list --output=$(LOG_DIR)
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
		-e CONSOLE_URL=$(CONSOLE_URL_HARDCODED) \
		-e KUBEADMIN_PASSWORD=$(KUBEADMIN_PASSWORD_HARDCODED) \
		-e TEST_USER=$(CLUSTER_USER) \
		-e USER_PASSWORD=$(CLUSTER_PASS) \
		-e USER_PROVIDER=$(USER_PROVIDER) \
		$(DOCKER_IMAGE) \
		bash -c "\
			npm install playwright @playwright/test && \
			npx playwright install --with-deps && \
			npx playwright test $(TEST_FILE) --reporter=list --output=$(LOG_DIR_CONTAINER) \
		"
	@echo "E2E tests completed. Logs and report saved in $(LOG_DIR)"