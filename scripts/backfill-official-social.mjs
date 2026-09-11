import { officialSocialAccounts } from './social-collector.mjs';
import { readJson, writeJson } from './content-utils.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const startDate = process.env.BACKFILL_START || '2026-09-01';
const endDate = process.env.BACKFILL_END || '2026-09-10';
const maxPages = Math.max(1, Math.min(20, Number(process.env.BACKFILL_SOCIAL_PAGES) || 12));
const dir = new URL('../runtime/', import.meta.url);

function chinaTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(date).replace(' ', 'T');
}

export function parseOfficialSocialHistory(data, account, start = startDate, end = endDate) {
  return (data?.data?.list || []).flatMap(post => {
    const published = chinaTimestamp(post.created_at);
    const date = published.slice(0, 10);
    const author = post.user || {};
    const text = String(post.text_raw || '').replace(/[\u200B-\u200D\uFEFF]/gu, '').trim();
    if (!published || date < start || date > end || String(author.id) !== account.uid || !author.verified || !post.mblogid || !text) return [];
    return [{
      sourceId: account.sourceId,
      sourceName: account.sourceName,
      sourceType: 'official-social',
      title: text.split('\n').find(line => line.trim()).slice(0, 120),
      url: `https://weibo.com/${account.uid}/${post.mblogid}`,
      publishedAt: date,
      publishedTime: `${published}:00+08:00`,
      authorVerified: true,
      authorId: account.uid,
      authorName: account.name,
      verificationEvidence: '历史分页返回的发布者 UID、蓝V 标识与指定官方账号一致',
      contentParagraphs: [text],
      contentComplete: !post.isLongText,
      contentScope: 'post-text'
    }];
  });
}

async function proxy(path, body) {
  const response = await fetch(`http://localhost:3456${path}`, { ...(body === undefined ? {} : { method: 'POST', body }), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || `浏览器读取返回 ${response.status}`);
  return result;
}

const pageExpression = (uid, page) => `fetch('/ajax/statuses/mymblog?uid=${uid}&page=${page}&feature=0', { credentials: 'include' }).then(response => response.json()).then(data => JSON.stringify({ data: { list: (data.data?.list || []).map(post => ({ created_at: post.created_at, mblogid: post.mblogid, text_raw: post.text_raw, isLongText: post.isLongText, user: { id: post.user?.id, verified: post.user?.verified } })) } }))`;
export async function collectOfficialSocialHistory() {
  const candidates = [];
  const sourceResults = [];
  for (const account of officialSocialAccounts) {
    let targetId;
    try {
      ({ targetId } = await proxy('/new', account.url));
      if (!targetId) throw new Error('未能创建官方账号历史读取页面');
      let oldPages = 0;
      for (let page = 1; page <= maxPages && oldPages < 2; page++) {
        const { value } = await proxy(`/eval?target=${targetId}`, pageExpression(account.uid, page));
        const data = typeof value === 'string' ? JSON.parse(value) : value;
        const posts = data?.data?.list || [];
        if (!posts.length) break;
        candidates.push(...parseOfficialSocialHistory(data, account));
        const dates = posts.map(post => chinaTimestamp(post.created_at).slice(0, 10)).filter(Boolean);
        if (dates.length && dates.every(date => date < startDate)) oldPages++;
        else oldPages = 0;
      }
      sourceResults.push({ sourceId: account.sourceId, status: 'partial', candidateCount: candidates.filter(item => item.sourceId === account.sourceId).length, entryUrl: account.url, historicalWindow: `${startDate} 至 ${endDate}`, reason: '按官方账号历史分页读取，仍可能受平台可见范围影响。' });
    } catch (error) {
      sourceResults.push({ sourceId: account.sourceId, status: 'failed', candidateCount: 0, entryUrl: account.url, reason: error.message });
    } finally {
      if (targetId) await proxy(`/close?target=${targetId}`).catch(() => {});
    }
  }
  return { candidates, sourceResults };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { candidates, sourceResults } = await collectOfficialSocialHistory();
  const file = new URL('candidates.json', dir);
  const existing = readJson(file, { candidates: [], sourceResults: [] });
  writeJson(file, {
    ...existing,
    candidates: [...new Map([...existing.candidates, ...candidates].map(item => [item.url, item])).values()],
    historicalBackfill: { completedAt: new Date().toISOString(), startDate, endDate, sourceResults }
  });
  console.log(`官微历史补档：${candidates.length} 条候选，覆盖 ${startDate} 至 ${endDate}。`);
}
