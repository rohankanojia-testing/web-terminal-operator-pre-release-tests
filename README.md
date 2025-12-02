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

### Installation

Install dependencies locally:

```bash
make install
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

The tests use environment variables for configuration. These are set automatically by the Makefile, but can be overridden:

- `CONSOLE_URL` - OpenShift console URL
- `KUBEADMIN_USERNAME` - Admin username (for admin mode)
- `KUBEADMIN_PASSWORD` - Admin password (for admin mode)
- `TEST_MODE` - Either `admin` or `user`
- `TEST_USER` - Regular user username (for user mode)
- `USER_PASSWORD` - Regular user password (for user mode)
- `USER_PROVIDER` - Identity provider name (for user mode)

**Note**: The Makefile contains hardcoded credentials for testing. In production environments, these should be moved to environment variables or a secure configuration file.

### Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report playwright-report
```

Or open `playwright-report/index.html` in your browser.

### Logs

Test logs and traces are saved in the `playwright_logs/` directory.

