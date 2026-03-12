import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import type { SupportedLanguage } from '../runtime/detector.js';

const EXTENSIONS: Record<SupportedLanguage, string> = {
  javascript: '.js',
  jsx:        '.jsx',
  typescript: '.ts',
  tsx:        '.tsx',
  python:     '.py',
  bash:       '.sh',
  go:         '.go',
  rust:       '.rs',
};

const RUNEX_TMP_BASE = join(tmpdir(), 'runex');

/**
 * Sanitizes code copied from AI assistants (ChatGPT, Claude, Gemini)
 * and other rich-text sources that introduce invisible or typographic characters.
 */
function sanitizeCode(code: string): string {
  let result = code

    // ── Markdown code fence artifacts (ChatGPT/Claude often wrap in ```) ─────
    // Must strip FIRST before touching content
    .replace(/^[ \t]*```[a-zA-Z]*[ \t]*\r?\n/gm, '')            // opening ```jsx, ```ts etc.
    .replace(/^[ \t]*```[ \t]*$/gm, '')                          // closing ``` on its own line

    // ── Quotes ──────────────────────────────────────────────────────────────
    .replace(/\u2018/g, "'")   // left single quotation mark
    .replace(/\u2019/g, "'")   // right single quotation mark  ← most common culprit
    .replace(/\u201A/g, "'")   // single low-9 quotation mark
    .replace(/\u201B/g, "'")   // single high-reversed-9 quotation mark
    .replace(/\u2032/g, "'")   // prime
    .replace(/\u2035/g, "'")   // reversed prime
    .replace(/\u201C/g, '"')   // left double quotation mark
    .replace(/\u201D/g, '"')   // right double quotation mark
    .replace(/\u201E/g, '"')   // double low-9 quotation mark
    .replace(/\u201F/g, '"')   // double high-reversed-9 quotation mark
    .replace(/\u2033/g, '"')   // double prime
    .replace(/\u2036/g, '"')   // reversed double prime
    .replace(/\u00B4/g, "'")   // acute accent used as quote
    .replace(/\u02BC/g, "'")   // modifier letter apostrophe (very common in AI output)
    .replace(/\u02B9/g, "'")   // modifier letter prime

    // ── Dashes ───────────────────────────────────────────────────────────────
    .replace(/\u2014/g, '--')  // em dash → --
    .replace(/\u2013/g, '-')   // en dash → -
    .replace(/\u2012/g, '-')   // figure dash → -
    .replace(/\u2011/g, '-')   // non-breaking hyphen → -

    // ── Spaces & invisible characters ────────────────────────────────────────
    .replace(/\u00A0/g, ' ')   // non-breaking space
    .replace(/\u200B/g, '')    // zero-width space
    .replace(/\u200C/g, '')    // zero-width non-joiner
    .replace(/\u200D/g, '')    // zero-width joiner
    .replace(/\uFEFF/g, '')    // BOM
    .replace(/\u2060/g, '')    // word joiner
    .replace(/[\u2000-\u200A]/g, ' ')  // various unicode spaces

    // ── Ellipsis ─────────────────────────────────────────────────────────────
    .replace(/\u2026/g, '...')

    // ── Windows-style line endings → Unix ────────────────────────────────────
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // ── Trailing whitespace per line ─────────────────────────────────────────
    .replace(/[ \t]+$/gm, '')

    .trimEnd();

  // ── Double-apostrophe artifact: '' used as empty string in JSX props ──────
  // AI tools sometimes emit '' (two single quotes) instead of "" for empty strings.
  // Only safe to replace when surrounded by = or JSX prop context.
  result = result.replace(/=\s*''/g, '=""');

  // ── Backtick used as single quote (some AI markdown renderers mangle these) ─
  // Only replace lone backticks NOT part of template literals (i.e., not paired)
  // We detect unpaired backticks by checking they don't have a closing backtick on same line
  result = result.split('\n').map((line) => {
    // If line has an odd number of backticks and no template literal pattern, convert to '
    const backtickCount = (line.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0 && !/`[^`]*`/.test(line)) {
      return line.replace(/`/g, "'");
    }
    return line;
  }).join('\n');

  return result;
}

export class TempDir {
  private sessionDir: string;

  constructor(sessionId: string) {
    this.sessionDir = join(RUNEX_TMP_BASE, `session-${sessionId}`);
  }

  get path(): string {
    return this.sessionDir;
  }

  async writeCode(code: string, language: SupportedLanguage): Promise<string> {
    await mkdir(this.sessionDir, { recursive: true });

    const ext = EXTENSIONS[language];
    const filename = language === 'go' ? 'main.go' : `app${ext}`;
    const filePath = join(this.sessionDir, filename);

    // Sanitize AI-copied code before writing
    let finalCode = sanitizeCode(code);

    // For Go, wrap in package main if needed
    if (language === 'go' && !finalCode.trim().startsWith('package')) {
      finalCode = `package main\n\n${finalCode}`;
    }

    await writeFile(filePath, finalCode, 'utf-8');

    // JSX/TSX needs a local package.json + node_modules so ink/react resolve
    if (language === 'jsx' || language === 'tsx') {
      await this.setupJsxEnvironment();
    }

    return filePath;
  }

  private async setupJsxEnvironment(): Promise<void> {
    const pkgPath = join(this.sessionDir, 'package.json');

    const pkg = {
      name: 'runex-session',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        react: '^18.2.0',
        ink: '^4.4.1',
      },
    };

    await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    console.log('\n  Installing JSX dependencies (ink, react)...');
    try {
      execSync('npm install --prefer-offline --silent', {
        cwd: this.sessionDir,
        stdio: 'inherit',
      });
    } catch {
      execSync('npm install --silent', {
        cwd: this.sessionDir,
        stdio: 'inherit',
      });
    }
  }

  async cleanup(): Promise<void> {
    try {
      await rm(this.sessionDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors — best effort
    }
  }

  /** Register process exit handlers to ensure cleanup even on crash */
  registerCleanupHandlers(): void {
    const cleanup = () => this.cleanup();
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(130); });
    process.on('SIGTERM', () => { cleanup(); process.exit(143); });
    process.on('uncaughtException', (err) => {
      console.error('Runex uncaught exception:', err);
      cleanup();
      process.exit(1);
    });
  }
}
