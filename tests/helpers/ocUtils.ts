import { exec } from 'child_process';
import { TERMINAL_OUTPUT_FILE_NAME } from "./constants";
import * as util from "node:util";

const execPromise = util.promisify(exec);

export class OcUtils {
    static async getTerminalOutput(lines: number = 10): Promise<string> {
        try {
            const namespace = process.env.WEB_TERMINAL_NAMESPACE;
            if (!namespace) throw new Error("WEB_TERMINAL_NAMESPACE environment variable is not set");

            // One-call shell command
            const command = `
sh -c '
  # Step 1: Get the first pod matching the devworkspace_name label
  POD=$(oc get pods -n ${namespace} \
    -l controller.devfile.io/devworkspace_name \
    -o jsonpath="{.items[?(@.metadata.labels.controller\\.devfile\\.io/devworkspace_name)].metadata.name}" | head -n 1)
  echo "[DEBUG] Found pod: $POD" >&2

  if [ -z "$POD" ]; then
    echo "[DEBUG] ERROR: No terminal pod found" >&2
    exit 1
  fi

  # Step 2: Wait until pod is ready
  echo "[DEBUG] Waiting for pod $POD to be Ready..." >&2
  oc wait pod "$POD" -n ${namespace} --for=condition=Ready --timeout=30s

  # Step 3: Tail last N lines from terminal file (stdout + stderr)
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
            console.error("Failed to fetch terminal output:", error.message);
            return "";
        }
    }
}
