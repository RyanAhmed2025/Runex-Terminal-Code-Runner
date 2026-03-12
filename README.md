# Runex

**Universal Runtime CLI Sandbox**

> Paste code. Run it. Watch it. Exit. Clean.

Runex is a cross-platform CLI tool that lets you paste arbitrary code directly into your terminal and execute it instantly — no project setup, no file management, no persistent clutter. It handles runtime detection, dependency installation, sandboxed execution, and automatic cleanup.

---

## The Idea

Most developer tools make you *set up* before you can *run*. You create a folder, initialize a project, install packages, configure a bundler — then finally run your code.

Runex inverts that completely.

You open a terminal. You paste code. You press `CTRL+D`. It runs.

**What makes Runex novel** is the execution model: it is the first general-purpose CLI sandbox that treats the terminal itself as a live runtime environment for any language — including full interactive UI frameworks like React Ink. Code runs inside an isolated child process with its own dependency scope, sandboxed filesystem, memory limits, and execution timeout. The session is ephemeral by design: when you exit, everything is gone.

This is not a REPL. It is not a notebook. It is not a script runner. It is a **universal ephemeral code execution sandbox with an interactive session layer** — a category of developer tool that does not previously exist as a standalone open-source CLI.

### Terminal-native JSX / React Ink execution

The most distinctive capability of Runex is its ability to execute JSX and TSX code as interactive terminal UIs using [React Ink](https://github.com/vadimdemedes/ink). React Ink renders React components to terminal cells instead of a browser DOM. Runex automates the entire pipeline:

- Detects JSX/TSX language selection
- Writes code to an isolated temp directory
- Generates a scoped `package.json` with `react` and `ink`
- Installs dependencies locally into the sandbox
- Transpiles via `esbuild` through `tsx`
- Executes in a child process with stdio bound to your terminal

The result: you can paste a fully interactive terminal UI — with keyboard input, colors, borders, animations — and have it running in seconds, with zero setup.

> **Patent note:** The combination of (1) ephemeral session scoping, (2) automatic per-session dependency installation into isolated temp directories, (3) JSX-to-terminal transpilation pipeline triggered from a paste-and-run interaction model, and (4) cross-platform new-window terminal launching — as a unified CLI execution primitive — represents a potentially novel software architecture. If you are building a commercial product on top of this concept, consult a patent attorney regarding defensive publication or patent filing.

---

## Install

### From GitHub ZIP (recommended)

```bash
# 1. Download and unzip runex.zip from the GitHub repo, then:
cd runex

# 2. Install dependencies
npm install

# 3. Build the TypeScript source
npm run build

# 4. Link globally so 'runex' works anywhere
npm link
```

That's it. Type `runex` in any terminal to start.

### Requirements

- Node.js 18 or higher
- npm 8 or higher
- Git (optional)

---

## Usage

```bash
runex
```

Runex will walk you through:

1. **Session name** — a label for this run
2. **Language** — pick your runtime
3. **Paste your code** — end input with `CTRL+D` or type `:done` on its own line

---

## Supported Languages

| Language   | Runtime           |
|------------|-------------------|
| JavaScript | Node.js           |
| JSX        | Node.js + esbuild |
| TypeScript | tsx               |
| TSX        | tsx + esbuild     |
| Python     | Python 3          |
| Bash       | bash              |
| Go         | go run            |
| Rust       | rustc             |

---

## Session Commands

After your code runs, use these at the `runex>` prompt:

| Command    | Action                            |
|------------|-----------------------------------|
| `:r`       | Reload and re-run the session     |
| `:e`       | Edit — re-paste updated code      |
| `:s`       | Show session info                 |
| `:k`       | Kill the running process          |
| `:inspect` | Show code around the last error   |
| `:q`       | Quit and clean up all temp files  |

---

## Try It — Interactive Terminal UI Example

Paste the following when prompted for JSX code. It renders a live interactive counter inside your terminal:

```jsx
import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";

function Counter() {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState("cyan");
  const { exit } = useApp();

  const colors = ["cyan", "magenta", "green", "yellow", "blue", "red"];

  useEffect(() => {
    setColor(colors[count % colors.length]);
  }, [count]);

  useInput((input, key) => {
    if (input === "q") exit();
    if (input === "+" || key.rightArrow) setCount(c => c + 1);
    if (input === "-" || key.leftArrow) setCount(c => Math.max(0, c - 1));
    if (input === "r") setCount(0);
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor={color}>
      <Box marginBottom={1} justifyContent="center">
        <Text bold color={color}> RUNEX COUNTER TEST </Text>
      </Box>
      <Box justifyContent="center" marginBottom={1}>
        <Text color={color} bold>
          {"  "}{count}{"  "}
        </Text>
      </Box>
      <Box flexDirection="column" alignItems="center">
        <Text dimColor>+ or → to increment</Text>
        <Text dimColor>- or ← to decrement</Text>
        <Text dimColor>r to reset</Text>
        <Text dimColor>q to quit</Text>
      </Box>
    </Box>
  );
}

render(<Counter />);
```

After pasting, type `:done` and press Enter. Then type `:r` to run it.

You will see a colored bordered box render live in your terminal. Press `+` and `-` to change the counter. The border color cycles through the spectrum as the number changes. Press `q` to exit.

This is React — running entirely inside a terminal window. No browser. No bundler config. No project folder.

---

## How It Works

```
runex
  │
  ├── Prompts for session name + language
  ├── Validates runtime is installed
  ├── Reads pasted code (CTRL+D to end)
  ├── Sanitizes AI-copied characters (smart quotes, BOM, zero-width spaces)
  ├── Writes code to /tmp/runex/session-<id>/
  ├── For JSX/TSX: generates package.json + runs npm install locally
  ├── Spawns isolated child process with memory + timeout limits
  ├── Optionally launches a new terminal window
  └── On exit: deletes all temp files automatically
```

---

## Security Model

| Layer             | Detail                                        |
|-------------------|-----------------------------------------------|
| Process isolation | All code runs in a child process, never main  |
| Execution timeout | 60 seconds (kills automatically)              |
| Memory limit      | Node: 128 MB max heap                         |
| Module blocking   | `child_process`, `net`, `http` blocked in JS  |
| Filesystem scope  | Sandboxed to `/tmp/runex/<session-id>/`       |
| Env stripping     | AWS keys and sensitive vars removed           |
| Code scanning     | Static analysis warns on `eval`, `exec`, etc  |

---

## Project Structure

```
runex/
├── bin/runex               # CLI entry point
├── src/
│   ├── index.ts
│   ├── cli/                # Banner, prompts, session loop
│   ├── runtime/            # Language detection + env validation
│   ├── sandbox/            # Child process executor + isolation
│   ├── terminal/           # New window launcher (Mac/Win/Linux)
│   ├── session/            # Session lifecycle manager
│   ├── security/           # Module guard, timeout, memory limits
│   └── utils/              # Temp dir management, logger
├── package.json
└── tsconfig.json
```

---

## Roadmap

- [ ] Auto-detect language from pasted code
- [ ] Browser-targeted JSX: auto-launch in Chrome/Edge
- [ ] Docker sandbox mode for true OS-level isolation
- [ ] Dependency inference (`import numpy` → suggest `pip install numpy`)
- [ ] `runex share` — publish session as shareable snippet
- [ ] Config file (`~/.runex/config.json`)

---

## License

MIT — see `LICENSE` file.
