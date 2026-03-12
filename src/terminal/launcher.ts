import { execa } from 'execa';
import { platform } from 'os';
import type { Session } from '../session/manager.js';
import type { SupportedLanguage } from '../runtime/detector.js';

type Platform = 'darwin' | 'linux' | 'win32';

function getExecCommand(language: SupportedLanguage, filePath: string): string {
  switch (language) {
    case 'javascript':   return `node "${filePath}"`;
    case 'jsx':
    case 'tsx':
    case 'typescript':   return `npx tsx "${filePath}"`;
    case 'python':       return `python3 "${filePath}"`;
    case 'bash':         return `bash "${filePath}"`;
    case 'go':           return `go run "${filePath}"`;
    case 'rust':
      const out = filePath.replace('.rs', '');
      return `rustc "${filePath}" -o "${out}" && "${out}"`;
    default:             return `cat "${filePath}"`;
  }
}

export class TerminalLauncher {
  private os: Platform;

  constructor() {
    this.os = platform() as Platform;
  }

  async isNewWindowAvailable(): Promise<boolean> {
    if (this.os === 'darwin') {
      return true; // osascript always available
    }
    if (this.os === 'win32') {
      return true; // cmd always available
    }
    // Linux: check for common terminal emulators
    for (const term of ['gnome-terminal', 'xterm', 'x-terminal-emulator', 'konsole']) {
      try {
        const r = await execa('which', [term], { reject: false });
        if (r.exitCode === 0) return true;
      } catch { /* skip */ }
    }
    return false;
  }

  async launch(filePath: string, language: SupportedLanguage, session: Session): Promise<void> {
    const cmd = getExecCommand(language, filePath);
    const title = `Runex: ${session.name} [${session.language}]`;

    try {
      switch (this.os) {
        case 'darwin':
          await this.launchMacOS(cmd, title);
          break;
        case 'win32':
          await this.launchWindows(cmd, title);
          break;
        case 'linux':
        default:
          await this.launchLinux(cmd, title);
          break;
      }
    } catch (err) {
      console.warn('Could not open new terminal window. Falling back to current terminal.');
    }
  }

  private async launchMacOS(cmd: string, title: string): Promise<void> {
    const script = `tell application "Terminal"
      activate
      do script "${cmd.replace(/"/g, '\\"')}"
      set name of front window to "${title.replace(/"/g, '\\"')}"
    end tell`;
    await execa('osascript', ['-e', script]);
  }

  private async launchWindows(cmd: string, title: string): Promise<void> {
    // Try PowerShell first, then CMD
    try {
      await execa('powershell', [
        '-NoExit',
        '-Command',
        `$host.ui.RawUI.WindowTitle = '${title}'; ${cmd}`,
      ], { detached: true, stdio: 'ignore' });
    } catch {
      await execa('cmd', ['/k', `title ${title} && ${cmd}`], {
        detached: true,
        stdio: 'ignore',
      });
    }
  }

  private async launchLinux(cmd: string, title: string): Promise<void> {
    const terminals = [
      ['gnome-terminal', ['--title', title, '--', 'bash', '-c', `${cmd}; exec bash`]],
      ['x-terminal-emulator', ['-T', title, '-e', `bash -c "${cmd}; exec bash"`]],
      ['xterm', ['-T', title, '-e', `bash -c "${cmd}; exec bash"`]],
      ['konsole', ['--title', title, '-e', `bash -c "${cmd}; exec bash"`]],
    ] as [string, string[]][];

    for (const [term, args] of terminals) {
      try {
        const which = await execa('which', [term], { reject: false });
        if (which.exitCode === 0) {
          await execa(term, args, { detached: true, stdio: 'ignore' });
          return;
        }
      } catch { /* try next */ }
    }

    throw new Error('No terminal emulator found.');
  }
}
