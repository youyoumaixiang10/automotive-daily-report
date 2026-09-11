import { load } from 'cheerio';
import { collectBrowserHtml } from './browser-collector.mjs';
import { chinaDate, readJson, writeJson } from './content-utils.mjs';
import { sourceRegistry } from '../data/sources.js';
import { monitoringCoverage } from '../data/monitoring-coverage.js';

const dir = new URL('../runtime/', import.meta.url);
const previous = readJson(new URL('search-candidates.json', dir), { candidates: [] }).candidates;
const searchSources = sourceRegistry.filter(source => source.method === 'browser-search');
const sourceForUrl = value => {
  try {
    const host = new URL(value).hostname.replace(/^www\./u, '');
    return searchSources.find(source => {
      const sourceHosts = source.hosts || [new URL(source.url).hostname];
      return sourceHosts.some(candidate => {
        const sourceHost = candidate.replace(/^www\./u, '');
        return host === sourceHost || host.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${host}`);
      });
    });
  } catch { return null; }
};
const previousDay = date => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
};
const targetDate = previousDay(chinaDate());
const [year, month, day] = targetDate.split('-');
const targetText = `${year}年${Number(month)}月${Number(day)}日`;
const queries = [...monitoringCoverage.flatMap(item => [
  `${targetText} ${item.brand} 汽车`,
  `${targetText} ${item.brand} 汽车 上市 发布 改款 年款 新增版本`
]), `${targetText} 汽车行业 政策`];
function destination(href) {
  try {
    const url = new URL(href);
    const encoded = url.searchParams.get('u');
    if (url.hostname.endsWith('bing.com') && encoded?.startsWith('a1')) return Buffer.from(encoded.slice(2), 'base64').toString('utf8');
    return url.href;
  } catch { return ''; }
}
const collected = [];
const sourceCounts = new Map(searchSources.map(source => [source.id, 0]));
for (const query of queries) {
  try {
    const html = await collectBrowserHtml(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
    const $ = load(html);
    for (const link of $('li.b_algo h2 a').toArray()) {
      const url = destination($(link).attr('href') || '');
      const source = sourceForUrl(url);
      const title = $(link).text().trim();
      if (!source || !title || !url) continue;
      collected.push({ sourceId: source.id, sourceName: source.name, sourceType: source.sourceType, title, url, publishedAt: null, discoveryQuery: query });
      sourceCounts.set(source.id, (sourceCounts.get(source.id) || 0) + 1);
    }
  } catch { /* Other collectors still provide the daily report when a search page is unavailable. */ }
}
const candidates = [...new Map([...previous, ...collected].map(item => [item.url, item])).values()];
const sourceResults = searchSources.map(source => ({
  sourceId: source.id, url: source.url, status: sourceCounts.get(source.id) ? 'partial' : 'no-recent-updates',
  candidateCount: sourceCounts.get(source.id),
  publicLabel: sourceCounts.get(source.id) ? `已发现 ${sourceCounts.get(source.id)} 条待核验线索` : '未发现待核验线索'
}));
writeJson(new URL('search-candidates.json', dir), {
  collectedAt: new Date().toISOString(), targetDate, candidates, sourceResults,
  publicationRule: '搜索只用于发现线索；仅在原文页面核验发布日期与正文后，才会作为媒体报道进入日报。'
});
console.log(`搜索发现：${collected.length} 条候选，覆盖 ${queries.length} 个品牌与行业检索式。`);
