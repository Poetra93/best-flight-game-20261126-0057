// A small static file server for game/ (Node 22, standard library only).
//
// Development convenience, not a production web server: it serves the
// game's own directory on localhost so the game can be played and its
// screenshots taken in a desktop browser, with no build step:
//
//   node serve.ts            # http://localhost:8080
//   node serve.ts --port 9000
//
// It answers only with files inside game/, sends the MIME type a browser
// game needs for each extension, and refuses anything that climbs out of
// the directory.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameDir = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const argv = process.argv.slice(2);
const flagAt = argv.indexOf('--port');
const asked = flagAt === -1 ? NaN : Number(argv[flagAt + 1]);
const port = Number.isInteger(asked) && asked > 0 && asked < 65536 ? asked : 8080;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

function mimeFor(file) {
  return types[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function resolveInside(requestedPath) {
  const cleaned = normalize(requestedPath);
  const file = resolve(join(gameDir, cleaned));
  if (file !== gameDir && !file.startsWith(gameDir + sep)) return null;
  return file;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const file = resolveInside(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }

  let size;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
