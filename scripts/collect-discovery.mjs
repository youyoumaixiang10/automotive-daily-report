import { mkdirSync } from 'node:fs';
import { parseAutohomeNews } from './pilot-collectors.mjs';
import { identifyBrands, isIndustryNews, readJson, writeJson } from './content-utils.mjs';
import { collectBrowserHtml } from './browser-collector.mjs';
import { collectDongchediNews } from './dongchedi-collector.mjs';

const [autohomeAttempt, dongchediAttempt] = await Promise.allSettled([
  collectBrowserHtml('https://www.autohome.com.cn/news//').then(parseAutohomeNews),
  collectDongchediNews()
]);
const candidates = autohomeAttempt.status === 'fulfilled' ? autohomeAttempt.value : [];
const dongchedi = dongchediAttempt.status === 'fulfilled' ? dongchediAttempt.value : {
  candidates: [],
  sourceResults: [{ sourceId: 'dongchedi-news', url: 'https://www.dongchedi.com/news', status: 'failed', count: 0, reason: dongchediAttempt.reason.message }]
};
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 30);
const cutoffMonth = cutoff.toISOString().slice(0, 7);
const recentCandidates = [...candidates, ...dongchedi.candidates]
  .map(candidate => ({ ...candidate, candidateBrands: identifyBrands(candidate.title), industry: isIndustryNews(candidate.title) }))
  .filter(candidate => (!candidate.sourceMonth || candidate.sourceMonth >= cutoffMonth) && (candidate.candidateBrands.length || candidate.industry));
const outputDir = new URL('../runtime/', import.meta.url);
mkdirSync(outputDir, { recursive: true });
const outputFile = new URL('discovery-candidates.json', outputDir);
const previous = readJson(outputFile, { candidates: [] }).candidates;
writeJson(outputFile, {
  collectedAt: new Date().toISOString(),
  candidates: [...new Map([...previous, ...recentCandidates].map(item => [item.url, item])).values()],
  sourceResults: [{
    sourceId: 'autohome-news', url: 'https://www.autohome.com.cn/news//',
    status: autohomeAttempt.status === 'rejected' ? 'failed' : candidates.length ? 'ok' : 'empty',
    count: recentCandidates.filter(item => item.sourceId === 'autohome-news').length,
    ...(autohomeAttempt.status === 'rejected' ? { reason: autohomeAttempt.reason.message } : {})
  }, ...dongchedi.sourceResults],
  publicationRule: '原文、发布日期与作者校验后，可标注为媒体报道；缺少正文、日期或出处的线索留在待核实队列。'
});
console.log(`Collected ${recentCandidates.length} media discovery candidate(s); none were published to the daily report.`);
