/**
 * moduleGuard.ts
 *
 * Defines blocked and allowed module lists per language,
 * and provides a check utility used by the executor.
 */

export const JS_BLOCKED_MODULES = new Set([
  'child_process',
  'net',
  'http',
  'https',
  'http2',
  'dgram',
  'cluster',
  'worker_threads',
  'vm',
  'repl',
]);

export const JS_ALLOWED_MODULES = new Set([
  'react',
  'ink',
  'chalk',
  'path',
  'url',
  'querystring',
  'events',
  'stream',
  'buffer',
  'util',
  'assert',
  'crypto',
  'zlib',
  'string_decoder',
  'timers',
  'console',
  'process',
]);

export function isModuleBlocked(moduleName: string): boolean {
  return JS_BLOCKED_MODULES.has(moduleName);
}

export function isModuleAllowed(moduleName: string): boolean {
  return JS_ALLOWED_MODULES.has(moduleName);
}

/**
 * Scans code for potentially dangerous patterns.
 * Returns list of warnings (does not block execution, but logs them).
 */
export function scanCodeForRisks(code: string, language: string): string[] {
  const warnings: string[] = [];

  if (['javascript', 'jsx', 'typescript', 'tsx'].includes(language)) {
    if (/require\(['"]child_process['"]\)/.test(code)) {
      warnings.push('Code attempts to use child_process (blocked in sandbox).');
    }
    if (/require\(['"]fs['"]\)/.test(code) || /import.*from ['"]fs['"]/.test(code)) {
      warnings.push('Code accesses filesystem (fs). Sandbox restricts paths.');
    }
    if (/process\.exit/.test(code)) {
      warnings.push('Code calls process.exit — will terminate the sandbox session.');
    }
    if (/eval\(/.test(code)) {
      warnings.push('Code uses eval() — potential security risk.');
    }
    if (/new Function\(/.test(code)) {
      warnings.push('Code uses new Function() — potential security risk.');
    }
  }

  if (language === 'python') {
    if (/import os/.test(code) || /from os/.test(code)) {
      warnings.push('Code imports os module — has system access.');
    }
    if (/import subprocess/.test(code)) {
      warnings.push('Code imports subprocess — can run shell commands.');
    }
    if (/exec\(|eval\(/.test(code)) {
      warnings.push('Code uses exec/eval — potential security risk.');
    }
  }

  if (language === 'bash') {
    if (/rm -rf/.test(code)) {
      warnings.push('Code contains rm -rf — dangerous file deletion command.');
    }
    if (/curl|wget/.test(code)) {
      warnings.push('Code uses network tools (curl/wget).');
    }
  }

  return warnings;
}
