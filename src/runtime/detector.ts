export type SupportedLanguage =
  | 'javascript'
  | 'jsx'
  | 'typescript'
  | 'tsx'
  | 'python'
  | 'bash'
  | 'go'
  | 'rust';

export interface RuntimeInfo {
  language: SupportedLanguage;
  /** Binary to invoke for execution */
  binary: string;
  /** File extension to use for temp file */
  extension: string;
  /** Display name */
  label: string;
  /** Whether this language requires transpilation before execution */
  requiresTranspile: boolean;
}

const RUNTIME_MAP: Record<SupportedLanguage, RuntimeInfo> = {
  javascript: {
    language: 'javascript',
    binary: 'node',
    extension: '.js',
    label: 'JavaScript',
    requiresTranspile: false,
  },
  jsx: {
    language: 'jsx',
    binary: 'node',
    extension: '.jsx',
    label: 'JSX',
    requiresTranspile: true,
  },
  typescript: {
    language: 'typescript',
    binary: 'tsx',
    extension: '.ts',
    label: 'TypeScript',
    requiresTranspile: false,
  },
  tsx: {
    language: 'tsx',
    binary: 'tsx',
    extension: '.tsx',
    label: 'TSX',
    requiresTranspile: true,
  },
  python: {
    language: 'python',
    binary: 'python3',
    extension: '.py',
    label: 'Python',
    requiresTranspile: false,
  },
  bash: {
    language: 'bash',
    binary: 'bash',
    extension: '.sh',
    label: 'Bash',
    requiresTranspile: false,
  },
  go: {
    language: 'go',
    binary: 'go',
    extension: '.go',
    label: 'Go',
    requiresTranspile: false,
  },
  rust: {
    language: 'rust',
    binary: 'rustc',
    extension: '.rs',
    label: 'Rust',
    requiresTranspile: false,
  },
};

export class RuntimeDetector {
  getRuntimeInfo(language: SupportedLanguage): RuntimeInfo {
    return RUNTIME_MAP[language];
  }

  /**
   * Attempt to detect language from code content heuristics.
   * Used for AI-assist / future auto-detection.
   */
  detectFromCode(code: string): SupportedLanguage | null {
    if (code.includes('import React') || code.includes('from "react"') || /\.(jsx|tsx)/.test(code)) {
      return code.includes('tsx') ? 'tsx' : 'jsx';
    }
    if (code.startsWith('#!/usr/bin/env python') || code.startsWith('def ') || code.includes('import numpy')) {
      return 'python';
    }
    if (code.startsWith('#!/bin/bash') || code.startsWith('#!/bin/sh')) {
      return 'bash';
    }
    if (code.includes('package main') || code.includes('func main()')) {
      return 'go';
    }
    if (code.includes('fn main()') || code.includes('use std::')) {
      return 'rust';
    }
    if (code.includes(': string') || code.includes(': number') || code.includes('interface ')) {
      return 'typescript';
    }
    if (code.includes('console.log') || code.includes('require(') || code.includes('const ')) {
      return 'javascript';
    }
    return null;
  }

  getAllLanguages(): SupportedLanguage[] {
    return Object.keys(RUNTIME_MAP) as SupportedLanguage[];
  }
}
