import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sourceRegistry } from '../data/sources.js';
import { parseAvatrNews, parseLiAutoNews, parseMiitAutoNews, parseOnvoNews } from './pilot-collectors.mjs';

const stateDir = new URL('../runtime/', import.meta.url);
const stateFile = new URL('source-snapshots.json', stateDir);
const previous = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};

const parsers = {
  'li-auto-news': parseLiAutoNews,
  'avatr-news': parseAvatrNews,
  'onvo-about': parseOnvoNews,
  miit: parseMiitAutoNews
};
const monitorableSources = sourceRegistry.filter(source => source.monitorContent && parsers[source.id]);
const snapshots = await Promise.all(monitorableSources.map(async source => {
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CarBriefMonitor/1.0)' },
      signal: AbortSignal.timeout(15000)
    });
    const html = await response.text();
    const candidates = parsers[source.id](html);
    const fingerprint = createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
    return { id: source.id, fingerprint, reachable: response.ok };
  } catch {
    return { id: source.id, fingerprint: null, reachable: false };
  }
}));

const next = Object.fromEntries(snapshots.map(snapshot => [snapshot.id, snapshot]));
const changes = snapshots.map(snapshot => ({
  id: snapshot.id,
  state: !snapshot.reachable ? 'unreachable' : !previous[snapshot.id] ? 'new' : previous[snapshot.id].fingerprint === snapshot.fingerprint ? 'unchanged' : 'changed'
}));

mkdirSync(stateDir, { recursive: true });
writeFileSync(stateFile, `${JSON.stringify(next, null, 2)}\n`);
console.table(changes);
console.log(`Parsed-source changes: ${changes.filter(item => item.state === 'changed' || item.state === 'new').length} need review. ${sourceRegistry.length - monitorableSources.length} sources await a dedicated parser.`);
