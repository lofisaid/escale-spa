// Aperçu local de dist/ (équivalent d'un hébergement statique). Usage : npm run preview [-- --port 4173]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.BD_DIST || 'dist');
const portArg = process.argv.indexOf('--port');
const PORT = Number(portArg > -1 ? process.argv[portArg + 1] : process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.mp4': 'video/mp4' };

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.includes('..')) { res.writeHead(400); return res.end(); }
  let file = path.join(DIST, p);
  try {
    const st = await fs.stat(file);
    if (st.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { location: `${p}/` }); return res.end(); }
      file = path.join(file, 'index.html');
    }
    let body = await fs.readFile(file);
    // requêtes partielles (Range) pour la vidéo, comme Apache
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range && path.extname(file) === '.mp4') {
      const size = body.length; const start = range[1] ? +range[1] : size - +range[2]; const end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
      res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'public, max-age=31536000, immutable' });
      return res.end(body.subarray(start, end + 1));
    }
    const ext = path.extname(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'x-content-type-options': 'nosniff', ...(process.env.BD_DIST ? {} : { 'x-robots-tag': 'noindex, nofollow' }) };
    headers['cache-control'] = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
    if (/\.(html|css|js|svg|json|xml|txt)$/.test(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = zlib.gzipSync(body); headers['content-encoding'] = 'gzip'; }
    res.writeHead(200, headers); res.end(body);
  } catch {
    const nf = await fs.readFile(path.join(DIST, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); res.end(nf);
  }
}).listen(PORT, () => console.log(`Escale Spa — aperçu : http://localhost:${PORT}/fr/`));
