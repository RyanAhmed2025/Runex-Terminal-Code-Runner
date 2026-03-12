import { execa } from 'execa';
import type { SupportedLanguage } from './detector.js';

export interface ValidationResult {
  ok: boolean;
  runtime: string;
  version?: string;
  error?: string;
}

export interface DepsResult {
  allPresent: boolean;
  missing: string[];
}

/** Maps language → runtime check command */
const RUNTIME_CHECKS: Record<SupportedLanguage, { cmd: string; args: string[]; name: string }> = {
  javascript:  { cmd: 'node',    args: ['--version'], name: 'Node.js' },
  jsx:         { cmd: 'node',    args: ['--version'], name: 'Node.js' },
  typescript:  { cmd: 'node',    args: ['--version'], name: 'Node.js' },
  tsx:         { cmd: 'node',    args: ['--version'], name: 'Node.js' },
  python:      { cmd: 'python3', args: ['--version'], name: 'Python 3' },
  bash:        { cmd: 'bash',    args: ['--version'], name: 'Bash' },
  go:          { cmd: 'go',      args: ['version'],   name: 'Go' },
  rust:        { cmd: 'rustc',   args: ['--version'], name: 'Rust' },
};

/** Dependencies required for each language (npm packages, pip packages, etc.) */
const LANGUAGE_DEPS: Partial<Record<SupportedLanguage, { packages: string[]; manager: 'npm' | 'pip' }>> = {
  jsx: { packages: ['react', 'ink', 'esbuild'], manager: 'npm' },
  tsx: { packages: ['react', 'ink', 'esbuild'], manager: 'npm' },
};

export class EnvironmentValidator {
  async validate(language: SupportedLanguage): Promise<ValidationResult> {
    const check = RUNTIME_CHECKS[language];

    try {
      const result = await execa(check.cmd, check.args, { reject: false });
      const version = result.stdout?.trim() || result.stderr?.trim() || 'unknown';

      if (result.exitCode === 0) {
        return { ok: true, runtime: check.name, version };
      }

      return { ok: false, runtime: check.name, error: `Exit code ${result.exitCode}` };
    } catch {
      return { ok: false, runtime: check.name, error: 'Command not found' };
    }
  }

  async install(language: SupportedLanguage): Promise<boolean> {
    // Auto-install is platform-specific; here we provide guidance.
    // Real implementation would use platform package managers.
    const instructions: Partial<Record<SupportedLanguage, string>> = {
      javascript: 'brew install node / winget install OpenJS.NodeJS',
      jsx:        'brew install node / winget install OpenJS.NodeJS',
      typescript: 'brew install node / winget install OpenJS.NodeJS',
      tsx:        'brew install node / winget install OpenJS.NodeJS',
      python:     'brew install python3 / python.org/downloads',
      go:         'brew install go / go.dev/dl',
      rust:       'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
    };
    console.log(`\n  Install guide: ${instructions[language] ?? 'See language website'}\n`);
    return false; // Return false to indicate manual install required
  }

  async checkDependencies(language: SupportedLanguage): Promise<DepsResult> {
    const deps = LANGUAGE_DEPS[language];
    if (!deps) return { allPresent: true, missing: [] };

    const missing: string[] = [];

    for (const pkg of deps.packages) {
      const exists = await this.checkNpmPackage(pkg);
      if (!exists) missing.push(pkg);
    }

    return { allPresent: missing.length === 0, missing };
  }

  async installDependencies(language: SupportedLanguage, packages: string[]): Promise<void> {
    const deps = LANGUAGE_DEPS[language];
    if (!deps) return;

    if (deps.manager === 'npm') {
      await execa('npm', ['install', '-g', ...packages], { stdio: 'inherit' }).catch(() => {
        // fallback: local install
        return execa('npm', ['install', ...packages], { stdio: 'inherit' });
      });
    } else if (deps.manager === 'pip') {
      await execa('pip3', ['install', ...packages], { stdio: 'inherit' });
    }
  }

  private async checkNpmPackage(pkg: string): Promise<boolean> {
    try {
      const result = await execa('npm', ['list', '-g', pkg], { reject: false });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}
