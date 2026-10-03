// Cross-platform production start for the standalone build
// (replaces the Unix-only `NODE_ENV=production node …` inline env assignment).
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

await import(pathToFileURL(join(process.cwd(), '.next', 'standalone', 'server.js')).href);
