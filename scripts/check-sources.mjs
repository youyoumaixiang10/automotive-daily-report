import { sourceRegistry } from '../data/sources.js';
import { collectBrowserLinks } from './browser-collector.mjs';

const results = await Promise.all(sourceRegistry.map(async source => {
  try {
    if (source.method === 'browser-page') {
      const links = await collectBrowserLinks(source.url, '/news/');
      return { id: source.id, status: links.length ? 200 : 'no-content', ok: links.length > 0, reader: 'browser' };
    }
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CarBriefSourceCheck/1.0)' },
      signal: AbortSignal.timeout(15000)
    });
    return { id: source.id, status: response.status, ok: response.ok };
  } catch (error) {
    return { id: source.id, status: 'unreachable', ok: false, reason: error.message };
  }
}));

console.table(results);
const failed = results.filter(result => !result.ok);
console.log(`Source health: ${results.length - failed.length}/${results.length} reachable.`);
if (failed.length) process.exitCode = 1;
