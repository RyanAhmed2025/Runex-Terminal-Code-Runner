import chalk from 'chalk';

export function printBanner(): void {
  const border = chalk.cyan('─'.repeat(35));
  console.log();
  console.log(chalk.cyan('╭') + border + chalk.cyan('╮'));
  console.log(chalk.cyan('│') + chalk.bold.white('         RUNEX SESSION           ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.dim('   Universal Runtime Executor    ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.dim('   Paste → Run → Observe → Exit  ') + chalk.cyan('│'));
  console.log(chalk.cyan('╰') + border + chalk.cyan('╯'));
  console.log();
}

export function printSessionInfo(name: string, language: string, id: string): void {
  console.log(chalk.cyan('┌─ Session Info ──────────────────────┐'));
  console.log(chalk.cyan('│') + ` Name:     ${chalk.yellow(name.padEnd(26))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Language: ${chalk.green(language.padEnd(26))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` ID:       ${chalk.dim(id.padEnd(26))}` + chalk.cyan('│'));
  console.log(chalk.cyan('└─────────────────────────────────────┘'));
  console.log();
}

export function printHelp(): void {
  console.log(chalk.dim('  Session commands:'));
  console.log(chalk.cyan('  :r') + chalk.dim(' — reload session'));
  console.log(chalk.cyan('  :e') + chalk.dim(' — edit code'));
  console.log(chalk.cyan('  :s') + chalk.dim(' — show session info'));
  console.log(chalk.cyan('  :k') + chalk.dim(' — kill running process'));
  console.log(chalk.cyan('  :inspect') + chalk.dim(' — show code around last error line'));
  console.log(chalk.cyan('  :q') + chalk.dim(' — quit Runex'));
  console.log();
}
