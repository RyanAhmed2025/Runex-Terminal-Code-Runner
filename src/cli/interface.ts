import chalk from 'chalk';
import ora from 'ora';
import { printBanner, printSessionInfo, printHelp } from './banner.js';
import {
  promptSessionName,
  promptLanguage,
  promptInstall,
  readPastedCode,
  promptSessionCommand,
  promptConfirm,
} from './prompt.js';
import { RuntimeDetector, type SupportedLanguage } from '../runtime/detector.js';
import { EnvironmentValidator } from '../runtime/validator.js';
import { SessionManager } from '../session/manager.js';
import { SandboxExecutor } from '../sandbox/container.js';
import { TerminalLauncher } from '../terminal/launcher.js';
import { Logger } from '../utils/logger.js';
import { TempDir } from '../utils/tempDir.js';

export class RunexCLI {
  private sessionManager = new SessionManager();
  private logger = new Logger();

  async start(): Promise<void> {
    printBanner();

    // 1. Get session name
    const name = await promptSessionName();

    // 2. Choose language
    const language = await promptLanguage();
    console.log();

    // 3. Validate runtime environment
    const validator = new EnvironmentValidator();
    const spinner = ora(chalk.dim(`Checking ${language} runtime...`)).start();

    const validationResult = await validator.validate(language);

    if (!validationResult.ok) {
      spinner.fail(chalk.red(`${validationResult.runtime} not found.`));

      const shouldInstall = await promptInstall(validationResult.runtime);
      if (!shouldInstall) {
        console.log(chalk.dim('Cancelled. Exiting Runex.'));
        process.exit(0);
      }

      const installSpinner = ora(chalk.dim(`Installing ${validationResult.runtime}...`)).start();
      const installed = await validator.install(language);
      if (!installed) {
        installSpinner.fail(chalk.red('Auto-install failed. Please install manually.'));
        process.exit(1);
      }
      installSpinner.succeed(chalk.green(`${validationResult.runtime} installed.`));
    } else {
      spinner.succeed(chalk.green(`${validationResult.runtime} detected.`));
    }

    // 4. Check/install language-specific dependencies
    const depsSpinner = ora(chalk.dim('Checking dependencies...')).start();
    const depsResult = await validator.checkDependencies(language);

    if (!depsResult.allPresent && depsResult.missing.length > 0) {
      depsSpinner.warn(chalk.yellow(`Missing deps: ${depsResult.missing.join(', ')}`));
      const shouldInstallDeps = await promptConfirm(`Install missing packages? (${depsResult.missing.join(', ')})`);
      if (shouldInstallDeps) {
        await validator.installDependencies(language, depsResult.missing);
      }
    } else {
      depsSpinner.succeed(chalk.green('Dependencies OK.'));
    }

    // 5. Read pasted code
    const code = await readPastedCode();

    if (!code.trim()) {
      console.log(chalk.red('\n  No code provided. Exiting.'));
      process.exit(0);
    }

    // 6. Create session
    const session = await this.sessionManager.create({ name, language });
    printSessionInfo(name, language, session.id);
    printHelp();

    // 7. Write code to temp sandbox dir
    const tempDir = new TempDir(session.id);
    const filePath = await tempDir.writeCode(code, language);

    // 8. Launch execution
    const launcher = new TerminalLauncher();
    const useNewWindow = await launcher.isNewWindowAvailable();

    const executor = new SandboxExecutor(session, this.logger);

    if (useNewWindow) {
      console.log(chalk.dim('  Launching in new terminal window...\n'));
      await launcher.launch(filePath, language, session);
    } else {
      console.log(chalk.dim('  Running in current terminal...\n'));
      console.log(chalk.cyan('─'.repeat(40)));
      await executor.run(filePath, language);
      console.log(chalk.cyan('─'.repeat(40)));
    }

    // 9. Session command loop
    await this.sessionLoop(session, filePath, language, executor, tempDir);
  }

  private async sessionLoop(
    session: ReturnType<SessionManager['create']> extends Promise<infer T> ? T : never,
    filePath: string,
    language: SupportedLanguage,
    executor: SandboxExecutor,
    tempDir: TempDir,
  ): Promise<void> {
    while (true) {
      const cmd = await promptSessionCommand();

      switch (cmd) {
        case ':q':
          console.log(chalk.dim('\n  Cleaning up session...'));
          await tempDir.cleanup();
          this.sessionManager.end(session.id);
          console.log(chalk.green('  Session ended. Goodbye.\n'));
          process.exit(0);
          break;

        case ':r':
          console.log(chalk.dim('\n  Reloading session...\n'));
          console.log(chalk.cyan('─'.repeat(40)));
          await executor.run(filePath, language);
          console.log(chalk.cyan('─'.repeat(40)));
          break;

        case ':inspect': {
          const { readFile } = await import('fs/promises');
          const src = await readFile(filePath, 'utf-8');
          const lines = src.split('\n');
          console.log(chalk.dim(`\n  File: ${filePath}`));
          console.log(chalk.dim(`  Total lines: ${lines.length}\n`));
          // Print lines 370-385 if file is long enough, else full file
          const start = Math.max(0, 370);
          const end = Math.min(lines.length, 385);
          const slice = lines.length > 30 ? lines.slice(start, end) : lines;
          const offset = lines.length > 30 ? start : 0;
          slice.forEach((line, i) => {
            const lineNum = offset + i + 1;
            const marker = lineNum === 378 ? chalk.red(' >>>') : '    ';
            console.log(`${marker} ${chalk.dim(String(lineNum).padStart(4))}  ${line}`);
          });
          console.log();
          break;
        }

        case ':k':
          executor.kill();
          console.log(chalk.yellow('  Process killed.'));
          break;

        case ':s':
          const info = this.sessionManager.getInfo(session.id);
          printSessionInfo(info.name, info.language, info.id);
          break;

        case ':e':
          console.log(chalk.dim('\n  Paste updated code (CTRL+D or :done to finish):\n'));
          const newCode = await readPastedCode();
          if (newCode.trim()) {
            await tempDir.writeCode(newCode, language);
            console.log(chalk.green('  Code updated. Use :r to reload.\n'));
          }
          break;

        case ':help':
        case '':
          printHelp();
          break;

        default:
          console.log(chalk.dim(`  Unknown command: ${cmd}. Type :help for commands.`));
      }
    }
  }
}
