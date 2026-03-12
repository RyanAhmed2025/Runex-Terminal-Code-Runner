import { execa, type ExecaChildProcess } from 'execa';
import { join, dirname } from 'path';
import chalk from 'chalk';
import type { Session } from '../session/manager.js';
import type { Logger } from '../utils/logger.js';
import type { SupportedLanguage } from '../runtime/detector.js';

const EXECUTION_TIMEOUT_MS = 60_000; // 60 seconds
const NODE_MEMORY_LIMIT = 128; // MB

/**
 * Commands used to execute each language after optional transpilation.
 */
function buildExecArgs(
  language: SupportedLanguage,
  filePath: string,
): { cmd: string; args: string[] } {
  const dir = dirname(filePath);

  switch (language) {
    case 'javascript':
      return { cmd: 'node', args: [`--max-old-space-size=${NODE_MEMORY_LIMIT}`, filePath] };

    case 'jsx':
    case 'tsx':
      // tsx resolves imports from the file's own directory (where we installed ink/react)
      return { cmd: 'npx', args: ['--yes', 'tsx', filePath] };

    case 'typescript':
      return { cmd: 'npx', args: ['--yes', 'tsx', filePath] };

    case 'python':
      return { cmd: 'python3', args: [filePath] };

    case 'bash':
      return { cmd: 'bash', args: [filePath] };

    case 'go':
      return { cmd: 'go', args: ['run', filePath] };

    case 'rust': {
      // Rust must be compiled first
      const outBin = join(dir, 'runex_bin');
      return { cmd: 'sh', args: ['-c', `rustc ${filePath} -o ${outBin} && ${outBin}`] };
    }

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export class SandboxExecutor {
  private session: Session;
  private logger: Logger;
  private currentProcess: ExecaChildProcess | null = null;

  constructor(session: Session, logger: Logger) {
    this.session = session;
    this.logger = logger;
  }

  async run(filePath: string, language: SupportedLanguage): Promise<void> {
    const { cmd, args } = buildExecArgs(language, filePath);

    console.log(chalk.dim(`  Running: ${cmd} ${args.join(' ')}\n`));

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      this.kill();
      console.log(chalk.red(`\n  Execution timeout (${EXECUTION_TIMEOUT_MS / 1000}s). Process killed.`));
    }, EXECUTION_TIMEOUT_MS);

    try {
      const proc = execa(cmd, args, {
        stdio: 'inherit',
        cwd: dirname(filePath),
        env: {
          ...process.env,
          // Prevent access to dangerous env vars
          AWS_SECRET_ACCESS_KEY: undefined,
          AWS_ACCESS_KEY_ID: undefined,
        },
        timeout: EXECUTION_TIMEOUT_MS,
        reject: false,
      });

      this.currentProcess = proc;
      this.session.process = proc;

      const result = await proc;
      clearTimeout(timeout);

      if (!timedOut) {
        if (result.exitCode === 0) {
          console.log(chalk.green('\n  ✓ Process exited cleanly.'));
        } else {
          console.log(chalk.red(`\n  ✗ Process exited with code ${result.exitCode}.`));
          this.logger.log(this.session.id, `Exit code: ${result.exitCode}`);
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (!timedOut) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`\n  Execution error: ${message}`));
        this.logger.log(this.session.id, `Error: ${message}`);
      }
    } finally {
      this.currentProcess = null;
    }
  }

  kill(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      setTimeout(() => {
        this.currentProcess?.kill('SIGKILL');
      }, 2000);
      this.currentProcess = null;
    }
  }
}
