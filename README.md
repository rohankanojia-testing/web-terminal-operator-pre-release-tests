# Web Terminal Operator Pre-Release Tests

## Introduction

This repository contains end-to-end (E2E) test suites for the OpenShift Web Terminal Operator using Playwright. The tests validate various functionalities of the OpenShift web terminal, including basic command execution, CLI tool availability, and `wtoctl` command operations.

The test suite covers:
- **Basic Web Terminal Operations**: Verifying `oc` commands, help command, and CLI tool availability
- **WTOCTL Image Management**: Testing image changes via `wtoctl set image`
- **WTOCTL Shell Configuration**: Testing shell changes via `wtoctl set shell`
- **WTOCTL Storage Configuration**: Testing storage changes via `wtoctl set storage`
- **WTOCTL Timeout Configuration**: Testing timeout changes via `wtoctl set timeout`

The tests are designed to run sequentially and support both admin and regular user authentication modes.

### Prerequisites

- Node.js and npm installed
- Docker (optional, for running tests in Docker)
- Access to an OpenShift cluster console
- Valid OpenShift credentials
- Web Terminal Operator Installed on OpenShift cluster
- DevWorkspace Operator Installed on OpenShift cluster

### Environment Configuration

You can store all OpenShift cluster related test parameters in a `.env` file instead of editing the Makefile.

#### Create `.env` file:

Create a file named `.env` in the repository root (see [`sample-env.txt`](./sample-env.txt) in this repo):

```env
CONSOLE_URL=https://console-openshift-console.apps-crc.testing

# Admin credentials (required when testing admin scenario)
KUBEADMIN_USERNAME=
KUBEADMIN_PASSWORD=
EXPECTED_KUBEADMIN_WHOAMI_OUTPUT=
ADMIN_WEB_TERMINAL_NAMESPACE=

# User credentials (required when testing regular user scenario)
CLUSTER_USER=
CLUSTER_USER_PASSWORD=
USER_PROVIDER=
USER_WEB_TERMINAL_NAMESPACE=

# General
PLAYWRIGHT_TESTS_HEADLESS=
```

### Installation

#### Installing Node dependencies
Install dependencies locally:

```bash
make install
```

## Installing browser binaries:
Since Playwright does not automatically download the browsers during npm install, run the following command to download Chromium:
```shell
npx playwright install chromium
```

### Running Tests

#### Run All Tests Locally (Cluster Admin Mode)
Before running make sure that you've logged into terminal via `oc` for specified user. Test checks pod state by `oc exec`
into terminal pod, it's necessary to log in with correct user:
```bash
oc login -u kubeadmin -p <your-pwd> https://api.crc.testing:6443
make test
```

This will:
- Install dependencies if needed
- Run all Playwright tests in admin mode
- Save logs and reports to `playwright_logs/` directory

#### Run All Tests Locally (User Mode)

Note: Test assumes that user is already created. Please run the script for creating user.

Before running make sure that you've logged into terminal via `oc` for specified user. Test checks pod state by `oc exec`
into terminal pod, it's necessary to log in with correct user:
```bash
oc login -u developer -p developer https://api.crc.testing:6443
make test-user
```

#### Run a Specific Test File

You can run a specific test file by setting the `TEST_FILE` environment variable:

```bash
make test TEST_FILE=tests/01_webTerminalBasicCommands.spec.ts
```

Or:

```bash
make test-user TEST_FILE=tests/02_webTerminalWtoctlChangeImage.spec.ts
```

#### Run Tests in Docker

To run tests in a Docker container:

```bash
make test-docker
```

This uses the official Playwright Docker image and automatically installs dependencies and browsers.

### Test Files

- `tests/01_webTerminalBasicCommands.spec.ts` - Basic terminal commands and CLI tool verification
- `tests/02_webTerminalWtoctlChangeImage.spec.ts` - Testing `wtoctl set image` functionality
- `tests/03_webTerminalWtoctlChangeShell.spec.ts` - Testing `wtoctl set shell` functionality
- `tests/04_webTerminalWtoctlChangeStorage.spec.ts` - Testing `wtoctl set storage` functionality
- `tests/05_webTerminalWtoctlChangeTimeout.spec.ts` - Testing `wtoctl set timeout` functionality

### Configuration

The tests use environment variables for configuration. These are supposed to be set in `.env` file by user before running tests:

- `CONSOLE_URL` - OpenShift console URL
- `KUBEADMIN_USERNAME` - Admin username (for admin mode)
- `KUBEADMIN_PASSWORD` - Admin password (for admin mode)
- `CLUSTER_USER` - Regular user username (for user mode)
- `CLUSTER_USER_PASSWORD` - Regular user password (for user mode)
- `USER_PROVIDER` - Identity provider name (for user mode)


### Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report playwright-report
```

Or open `playwright-report/index.html` in your browser.

### Logs

Test logs and traces are saved in the `playwright_logs/` directory.

