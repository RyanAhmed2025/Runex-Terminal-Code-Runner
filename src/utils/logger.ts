import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), '.runex', 'logs');

export class Logger {
  async log(sessionId: string, message: string): Promise<void> {
    try {
      await mkdir(LOG_DIR, { recursive: true });
      const logFile = join(LOG_DIR, `${sessionId}.log`);
      const timestamp = new Date().toISOString();
      await appendFile(logFile, `[${timestamp}] ${message}\n`);
    } catch {
      // Silent fail — logging should never crash the session
    }
  }

  async error(sessionId: string, err: Error): Promise<void> {
    await this.log(sessionId, `ERROR: ${err.message}\n${err.stack ?? ''}`);
  }

  getLogPath(sessionId: string): string {
    return join(LOG_DIR, `${sessionId}.log`);
  }
}
