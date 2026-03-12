import { randomBytes } from 'crypto';
import type { ExecaChildProcess } from 'execa';
import type { SupportedLanguage } from '../runtime/detector.js';

export interface Session {
  id: string;
  name: string;
  language: SupportedLanguage;
  runtime: string;
  tempPath: string;
  startTime: Date;
  process: ExecaChildProcess | null;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  async create(opts: { name: string; language: SupportedLanguage }): Promise<Session> {
    const id = randomBytes(6).toString('hex');
    const session: Session = {
      id,
      name: opts.name,
      language: opts.language,
      runtime: this.getRuntimeLabel(opts.language),
      tempPath: `/tmp/runex/${id}`,
      startTime: new Date(),
      process: null,
    };
    this.sessions.set(id, session);
    return session;
  }

  getInfo(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    return session;
  }

  end(id: string): void {
    const session = this.sessions.get(id);
    if (session?.process) {
      session.process.kill();
    }
    this.sessions.delete(id);
  }

  listActive(): Session[] {
    return [...this.sessions.values()];
  }

  private getRuntimeLabel(language: SupportedLanguage): string {
    const labels: Record<SupportedLanguage, string> = {
      javascript: 'Node.js',
      jsx:        'Node.js + esbuild',
      typescript: 'tsx (Node.js)',
      tsx:        'tsx (Node.js) + esbuild',
      python:     'Python 3',
      bash:       'Bash',
      go:         'Go',
      rust:       'rustc',
    };
    return labels[language];
  }
}
