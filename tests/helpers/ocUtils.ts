import { exec } from 'child_process';
import * as util from "node:util";

const execPromise = util.promisify(exec);

export class OcUtils {
    constructor(private labelSelector: string) {}

    async getTerminalOutput(): Promise<string> {
        try {
            // Read namespace from environment variable
            const namespace = process.env.WEB_TERMINAL_NAMESPACE;
            if (!namespace) {
                throw new Error('WEB_TERMINAL_NAMESPACE environment variable is not set');
            }

            // Always assume tooling container
            const { stdout, stderr } = await execPromise(
                `oc logs -n ${namespace} -c tooling -l ${this.labelSelector}`
            );

            if (stderr) {
                console.error('Error fetching logs:', stderr);
            }

            return stdout.trim();
        } catch (error: any) {
            console.error('Failed to execute oc logs:', error.message);
            return '';
        }
    }
}
