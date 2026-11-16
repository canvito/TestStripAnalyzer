#!/usr/bin/env node
// Minimal static file server for local development: `npm run serve` then open http://localhost:8080
// (or http://<this-PC's-LAN-IP>:8080 from a phone on the same Wi-Fi).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (rel.includes('\0')) {
    res.writeHead(400).end('Bad request');
    return;
  }
  // The server is reachable from the LAN: never expose dot-files (.git, .env, ...) or dependencies.
  const segments = rel.split(/[\\/]/);
  let file = path.join(ROOT, rel);
  if ((file !== ROOT && !file.startsWith(ROOT + path.sep)) || segments.some((s) => s.startsWith('.') || s === 'node_modules')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await fs.promises.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await fs.promises.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`  http://localhost:${PORT}`);
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const n of nets ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`  http://${n.address}:${PORT}  (phone on same Wi-Fi)`);
  }
});
