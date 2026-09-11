import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { extname, resolve } from 'node:path';

const publicFiles = new Set(['index.html', 'app.js', 'data/view-utils.js', 'runtime/generated-reports.json', 'runtime/generated-launches.json', 'runtime/public-status.json',
  'styles.css', 'summary.css', 'section-styles.css', 'section-refresh.css', 'accent.css', 'layout-fixes.css', 'date-calendar.css', 'live-data.css']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };
export function createSiteServer(root = new URL('../', import.meta.url)) {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!publicFiles.has(file)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const content = await readFile(new URL(file, root));
      response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT || 5173);
  createSiteServer().listen(port, '127.0.0.1', () => console.log(`AutoPulse：http://localhost:${port}`));
}
