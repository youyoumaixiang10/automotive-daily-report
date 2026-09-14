import { readJson, writeJson } from './content-utils.mjs';
import { candidatesFromResponse, discoveryJobs, searchJob } from './openai-web-discovery.mjs';

const dir = new URL('../runtime/', import.meta.url);
const file = new URL('openai-search-candidates.json', dir);
const previous = readJson(file, { candidates: [] });
const jobs = discoveryJobs();
const queryRuns = [];
const collected = [];

if (!process.env.OPENAI_API_KEY) {
  writeJson(file, {
    collectedAt: new Date().toISOString(), providerStatus: 'unavailable', reason: 'OPENAI_API_KEY 未配置',
    jobs: jobs.map(job => ({ id: job.id, brand: job.brand })), queryRuns: [], candidates: previous.candidates || []
  });
  console.warn('OpenAI 网页检索未运行：OPENAI_API_KEY 未配置。');
  process.exit(0);
}

for (const job of jobs) {
  try {
    const response = await searchJob(job);
    const candidates = candidatesFromResponse(response, job);
    collected.push(...candidates);
    queryRuns.push({ id: job.id, brand: job.brand, status: 'completed', sourceCount: candidates.length, responseId: response.id });
  } catch (error) {
    queryRuns.push({ id: job.id, brand: job.brand, status: 'failed', sourceCount: 0, reason: error.message });
  }
}

const candidates = [...new Map([...(previous.candidates || []), ...collected].map(item => [item.url, item])).values()];
const failed = queryRuns.filter(run => run.status === 'failed');
writeJson(file, {
  collectedAt: new Date().toISOString(), providerStatus: failed.length ? 'partial' : 'completed',
  model: process.env.SEARCH_MODEL || 'gpt-5-mini', queryRuns, candidates,
  publicationRule: '网页检索仅用于发现原文；原文发布日期、正文与来源通过后才进入日报。'
});
console.log(`OpenAI 网页检索：完成 ${queryRuns.length - failed.length}/${queryRuns.length} 个品牌与行业任务，发现 ${collected.length} 条已登记来源线索。`);
if (failed.length === queryRuns.length) process.exitCode = 1;
