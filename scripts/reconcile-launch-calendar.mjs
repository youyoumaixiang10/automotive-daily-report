import { readJson, writeJson, cleanText } from './content-utils.mjs';
import { fileURLToPath } from 'node:url';

const evidenceLabels = { official: '官方发布', government: '政府公告', media: '媒体报道' };
const normalize = value => cleanText(value).replace(/(?:全新|新款|20\d{2}款)/gu, '').replace(/[\s/]/gu, '').toLowerCase();
const launchSignal = /(?:正式上市|迎来正式上市|今日上市|现已上市)/u;

export function reconcileLaunchCalendar(calendar, articles) {
  let changed = 0;
  const items = calendar.items.map(item => {
    if (item.status === 'launched' || !item.date) return item;
    const model = normalize(item.model);
    const match = articles.find(article => {
      const text = cleanText([article.title, ...(article.contentParagraphs || [])].join(' '));
      return article.publishedAt >= item.date && normalize(text).includes(model) && launchSignal.test(text);
    });
    if (!match) return item;
    const text = cleanText([match.title, ...(match.contentParagraphs || [])].join(' '));
    const price = text.match(/(?:上市限时先享价|限时先享价|上市价|指导价|售价)\s*([0-9.]+(?:\s*(?:-|—|至)\s*[0-9.]+)?\s*万元(?:起)?)/u)?.[1];
    changed += 1;
    return {
      ...item,
      kind: item.kind === '预计上市' ? '新车上市' : item.kind,
      priceText: price || item.priceText,
      status: 'launched',
      statusLabel: '已上市',
      sourceName: match.sourceName,
      sourceUrl: match.url,
      evidenceLabel: evidenceLabels[match.evidenceStatus] || item.evidenceLabel,
      publishedAt: match.publishedAt,
      detail: `${text.slice(0, 420)}${text.length > 420 ? '…' : ''}`,
      observation: '已由上市后可追溯报道回写状态与价格口径；后续权益以品牌最新公告为准。'
    };
  });
  return { calendar: { ...calendar, items }, changed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const calendarUrl = new URL('../data/launch-calendar.json', import.meta.url);
  const articlesUrl = new URL('../runtime/articles.json', import.meta.url);
  const calendar = readJson(calendarUrl, { items: [] });
  const articles = Object.values(readJson(articlesUrl, {}));
  const result = reconcileLaunchCalendar(calendar, articles);
  if (result.changed) writeJson(calendarUrl, result.calendar);
  console.log(`已复核 ${calendar.items.length} 条新车日历，回写 ${result.changed} 条上市状态。`);
}
