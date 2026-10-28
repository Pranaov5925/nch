// Cross-platform production start for the standalone build
// (replaces the Unix-only `NODE_ENV=production node …` inline env assignment).
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '10000';

const rootDb = resolve(process.cwd(), 'db', 'custom.db');
if (existsSync(rootDb)) {
  process.env.DATABASE_URL = `file:${rootDb}`;
}

await import(pathToFileURL(join(process.cwd(), '.next', 'standalone', 'server.js')).href);
