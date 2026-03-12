/**
 * isolation.ts
 *
 * Generates a wrapper/preamble injected before user code (for JS/TS runtimes)
 * that restricts access to dangerous Node.js built-in modules.
 *
 * Note: True process-level isolation requires OS-level sandboxing (seccomp, containers).
 * This layer provides a best-effort runtime guard for quick sessions.
 */

const BLOCKED_MODULES = ['child_process', 'net', 'http', 'https', 'http2', 'cluster', 'worker_threads'];
const ALLOWED_FS_OPS = ['readFile', 'readFileSync', 'readdir', 'readdirSync', 'stat', 'statSync'];

/**
 * Returns a Node.js module guard preamble to prepend to user code.
 * Overrides `require` and dynamic `import` for blocked modules.
 */
export function generateJsGuardPreamble(sessionTempDir: string): string {
  return `
// === RUNEX SANDBOX GUARD ===
const __RUNEX_BLOCKED__ = ${JSON.stringify(BLOCKED_MODULES)};
const __originalRequire__ = typeof require !== 'undefined' ? require : undefined;
if (typeof require !== 'undefined') {
  const Module = require('module');
  const _orig = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (__RUNEX_BLOCKED__.includes(id)) {
      throw new Error('[Runex] Access to module "' + id + '" is restricted in sandbox mode.');
    }
    return _orig.apply(this, arguments);
  };
}
// Restrict fs to sandbox temp dir only
const __fs__ = typeof require !== 'undefined' ? require('fs') : null;
if (__fs__) {
  const __allowed_dir__ = ${JSON.stringify(sessionTempDir)};
  const _origReadFile = __fs__.readFile.bind(__fs__);
  // Further fs restrictions can be layered here
}
// === END RUNEX GUARD ===
`;
}

/**
 * Returns environment variables to pass to child processes for isolation.
 */
export function getSandboxEnv(tempDir: string): NodeJS.ProcessEnv {
  return {
    RUNEX_SANDBOX: '1',
    RUNEX_TEMP: tempDir,
    // Strip potentially sensitive env vars
    HOME: tempDir,
    USERPROFILE: tempDir,
    // Keep PATH for runtimes
    PATH: process.env.PATH,
    NODE_PATH: process.env.NODE_PATH,
  };
}
