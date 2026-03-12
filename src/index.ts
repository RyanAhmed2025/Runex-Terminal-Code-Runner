import { RunexCLI } from './cli/interface.js';

const cli = new RunexCLI();
cli.start().catch((err) => {
  console.error('Runex crashed unexpectedly:', err);
  process.exit(1);
});
