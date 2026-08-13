import { exec } from 'child_process';
import { TERMINAL_OUTPUT_FILE_NAME } from "./constants";
import * as util from "node:util";

const execPromise = util.promisify(exec);

export class OcUtils {
    static async verifyCliUser(): Promise<void> {
        const namespace = process.env.WEB_TERMINAL_NAMESPACE;
        const testMode = process.env.TEST_MODE || 'admin';
        try {
            const { stdout } = await execPromise('oc whoami');
            const currentUser = stdout.trim();
            console.log(`[Preflight] oc CLI logged in as: ${currentUser}`);

            const { stdout: nsCheck } = await execPromise(
                `oc auth can-i list pods -n ${namespace} 2>&1 || true`
            );
            if (nsCheck.trim() !== 'yes') {
                throw new Error(
                    `Current oc user "${currentUser}" cannot list pods in namespace "${namespace}". ` +
                    `Run: oc login -u <${testMode === 'admin' ? 'kubeadmin' : 'expected-user'}> before running tests.`
                );
            }
            console.log(`[Preflight] oc CLI user "${currentUser}" has access to namespace "${namespace}"`);
        } catch (error: any) {
            if (error.message?.includes('cannot list pods')) throw error;
            throw new Error(
                `[Preflight] oc CLI is not logged in or not accessible: ${error.message}\n` +
                `Ensure KUBECONFIG is set and you are logged in with the correct user.`
            );
        }
    }

    static async getTerminalOutput(lines: number = 30, retries: number = 3, retryDelay: number = 1000): Promise<string> {
        const namespace = process.env.WEB_TERMINAL_NAMESPACE;
        if (!namespace) throw new Error("WEB_TERMINAL_NAMESPACE environment variable is not set");

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // One-call shell command with file existence check
                const command = `
sh -c '
  # Step 1: Get the first pod matching the devworkspace_name label
  POD=$(oc get pods -n ${namespace} \
    -l controller.devfile.io/devworkspace_name \
    -o jsonpath="{.items[?(@.metadata.labels.controller\\.devfile\\.io/devworkspace_name)].metadata.name}" | awk "{print \\$1}")
  echo "[DEBUG] Found pod: $POD" >&2

  if [ -z "$POD" ]; then
    echo "[DEBUG] ERROR: No terminal pod found" >&2
    exit 1
  fi

  # Step 2: Wait until pod is ready
  echo "[DEBUG] Waiting for pod $POD to be Ready..." >&2
  oc wait pod "$POD" -n ${namespace} --for=condition=Ready --timeout=30s >&2

  # Step 3: Check if file exists, if not wait briefly and retry
  echo "[DEBUG] Checking if ${TERMINAL_OUTPUT_FILE_NAME} exists in pod..." >&2
  if ! oc exec -n ${namespace} "$POD" -c web-terminal-tooling -- test -f /tmp/test-stdout.txt 2>/dev/null; then
    echo "[DEBUG] File does not exist yet, waiting..." >&2
    sleep 1
    # Try again after brief wait
    if ! oc exec -n ${namespace} "$POD" -c web-terminal-tooling -- test -f /tmp/test-stdout.txt 2>/dev/null; then
      echo "[DEBUG] File still does not exist" >&2
      exit 2
    fi
  fi

  # Step 4: Tail last N lines from terminal file (stdout + stderr)
  echo "[DEBUG] Fetching last ${lines} lines from ${TERMINAL_OUTPUT_FILE_NAME}" >&2
  oc exec -n ${namespace} "$POD" -c web-terminal-tooling -- tail -n ${lines} /tmp/test-stdout.txt
'
        `;

                const { stdout, stderr } = await execPromise(command);

                console.debug("=== One-call execution complete ===");
                if (stderr) console.debug("STDERR from shell command:\n", stderr);
                console.debug("STDOUT from shell command:\n", stdout);

                return stdout.trim();

            } catch (error: any) {
                const isFileNotFound = error.message?.includes("No such file") || error.code === 2;
                const isLastAttempt = attempt === retries;

                if (isFileNotFound && !isLastAttempt) {
                    console.debug(`[Retry ${attempt}/${retries}] File not ready yet, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                if (isLastAttempt) {
                    console.error(`Failed to fetch terminal output after ${retries} attempts:`, error.message);
                }
                return "";
            }
        }
        return "";
    }
}
