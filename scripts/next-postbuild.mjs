// Cross-platform post-build step: copy static assets into the standalone
// output (replaces the Unix-only `cp -r` shell command).
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

cpSync(join(root, '.next', 'static'), join(root, '.next', 'standalone', '.next', 'static'), { recursive: true });
cpSync(join(root, 'public'), join(root, '.next', 'standalone', 'public'), { recursive: true });

if (existsSync(join(root, 'db'))) {
  cpSync(join(root, 'db'), join(root, '.next', 'standalone', 'db'), { recursive: true });
}

console.log('Standalone assets copied (static + public + db).');
