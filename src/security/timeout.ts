/**
 * timeout.ts
 *
 * Execution timeout controller for sandbox sessions.
 */
import chalk from 'chalk';
import type { ExecaChildProcess } from 'execa';

export const DEFAULT_TIMEOUT_MS = 60_000;    // 60s
export const WARNING_THRESHOLD_MS = 50_000;  // warn at 50s

export class TimeoutController {
  private timer: NodeJS.Timeout | null = null;
  private warnTimer: NodeJS.Timeout | null = null;
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  start(proc: ExecaChildProcess, onTimeout: () => void): void {
    this.warnTimer = setTimeout(() => {
      const remaining = Math.round((this.timeoutMs - WARNING_THRESHOLD_MS) / 1000);
      console.log(chalk.yellow(`\n  ⚠ Session approaching timeout. ${remaining}s remaining.`));
    }, WARNING_THRESHOLD_MS);

    this.timer = setTimeout(() => {
      console.log(chalk.red('\n  ✗ Execution timeout reached. Killing process.'));
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 2000);
      onTimeout();
    }, this.timeoutMs);
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.warnTimer) clearTimeout(this.warnTimer);
    this.timer = null;
    this.warnTimer = null;
  }
}
