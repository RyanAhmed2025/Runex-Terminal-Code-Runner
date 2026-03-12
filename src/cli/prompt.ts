import inquirer from 'inquirer';
import chalk from 'chalk';
import { createInterface } from 'readline';
import type { SupportedLanguage } from '../runtime/detector.js';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'javascript',
  'jsx',
  'typescript',
  'tsx',
  'python',
  'bash',
  'go',
  'rust',
];

export async function promptSessionName(): Promise<string> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('Session name:'),
      default: `session-${Date.now().toString(36)}`,
      validate: (val: string) => val.trim().length > 0 || 'Name cannot be empty',
    },
  ]);
  return name.trim();
}

export async function promptLanguage(): Promise<SupportedLanguage> {
  const choices = [
    { name: 'JavaScript (.js)', value: 'javascript' },
    { name: 'JSX (.jsx)',       value: 'jsx' },
    { name: 'TypeScript (.ts)', value: 'typescript' },
    { name: 'TSX (.tsx)',       value: 'tsx' },
    { name: 'Python (.py)',     value: 'python' },
    { name: 'Bash (.sh)',       value: 'bash' },
    { name: 'Go (.go)',         value: 'go' },
    { name: 'Rust (.rs)',       value: 'rust' },
  ];

  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: chalk.cyan('Choose runtime:'),
      choices,
      pageSize: 8,
    },
  ]);

  return language as SupportedLanguage;
}

export async function promptInstall(tool: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`${tool} runtime not detected. Install automatically?`),
      default: false,
    },
  ]);
  return confirm;
}

export async function promptConfirm(message: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(message),
      default: true,
    },
  ]);
  return confirm;
}

/**
 * Read multi-line paste input from stdin.
 * Ends on CTRL+D (EOF) or a line containing only ":done"
 */
export async function readPastedCode(): Promise<string> {
  return new Promise((resolve) => {
    console.log();
    console.log(chalk.dim('  Paste your code below.'));
    console.log(chalk.dim('  Press CTRL+D (or type :done on a new line) when finished.\n'));

    const rl = createInterface({ input: process.stdin, terminal: false });
    const lines: string[] = [];

    rl.on('line', (line) => {
      if (line.trim() === ':done') {
        rl.close();
      } else {
        lines.push(line);
      }
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}

export async function promptSessionCommand(): Promise<string> {
  const { cmd } = await inquirer.prompt([
    {
      type: 'input',
      name: 'cmd',
      message: chalk.cyan('runex>'),
      prefix: '',
    },
  ]);
  return cmd.trim();
}
