import { monitoringCoverage } from '../data/monitoring-coverage.js';
import { sourceRegistry } from '../data/sources.js';
import { issueSearchDates } from './content-utils.mjs';

const searchableSources = sourceRegistry.filter(source => ['official', 'official-social', 'government', 'vertical-media'].includes(source.sourceType));

function sourceHosts(source) {
  return (source.hosts || [new URL(source.url).hostname]).map(host => host.replace(/^www\./u, ''));
}

export const allowedDomains = [...new Set(searchableSources.flatMap(sourceHosts))];

export function registeredSourceForUrl(value, brand = null) {
  try {
    const host = new URL(value).hostname.replace(/^www\./u, '');
    const matching = searchableSources.filter(source => sourceHosts(source).some(candidate =>
      host === candidate || host.endsWith(`.${candidate}`) || candidate.endsWith(`.${host}`)));
    return matching.find(source => brand && source.brands.includes(brand)) || matching[0] || null;
  } catch { return null; }
}

export function discoveryJobs(now = new Date()) {
  const [firstDate, secondDate] = issueSearchDates(now);
  const window = `${firstDate} 08:00 至 ${secondDate} 08:00（北京时间）`;
  const brandJobs = monitoringCoverage.map(({ brand, aliases }) => ({
    id: `brand:${brand}`,
    brand,
    aliases,
    prompt: `检索 ${window} 发布的中国汽车新闻，完整检查品牌“${brand}”及别名“${aliases.join('、')}”。重点寻找：新车上市、预售、改款、年款、新增版本、申报、技术发布、价格与促销权益、营销传播、品牌活动、销量、交付、重大回应。只采用品牌官网或已限定的可信媒体原文。请进行网页检索，并用极短文字说明是否找到相关原文；不要把旧闻当作本窗口新闻。`
  }));
  return [...brandJobs, {
    id: 'industry', brand: null, aliases: [],
    prompt: `检索 ${window} 发布的中国汽车行业重要信息。重点寻找国家政策与监管、行业协会数据、召回、重大产业事件、供应链、出口与关税、充换电和动力电池。只采用政府、行业或已限定的可信媒体原文。请进行网页检索，并用极短文字说明是否找到相关原文；不要把车型普通新闻误作行业新闻，也不要把旧闻当作本窗口新闻。`
  }];
}

export function responseSources(response) {
  const consulted = (response?.output || []).flatMap(item => item?.type === 'web_search_call' ? (item.action?.sources || []) : []);
  const cited = (response?.output || []).flatMap(item => item?.type === 'message' ? (item.content || []) : [])
    .flatMap(content => content.annotations || [])
    .filter(annotation => annotation.type === 'url_citation');
  const sources = [...consulted, ...cited].map(source => ({
    url: source.url || source.url_citation?.url || '',
    title: source.title || source.url_citation?.title || ''
  })).filter(source => source.url);
  return [...new Map(sources.map(source => [source.url, source])).values()];
}

export function candidatesFromResponse(response, job) {
  return responseSources(response).flatMap(item => {
    const source = registeredSourceForUrl(item.url, job.brand);
    if (!source) return [];
    return [{
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.sourceType,
      title: item.title || `${job.brand || '汽车行业'}相关信息`,
      url: item.url,
      publishedAt: null,
      discoveryProvider: 'openai-web-search',
      discoveryQuery: job.id,
      discoveryBrand: job.brand
    }];
  });
}

export async function searchJob(job, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 未配置');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: options.model || process.env.SEARCH_MODEL || 'gpt-5-mini',
      reasoning: { effort: 'low' },
      tools: [{
        type: 'web_search',
        filters: { allowed_domains: allowedDomains },
        user_location: { type: 'approximate', country: 'CN', city: 'Shanghai', region: 'Shanghai' },
        search_context_size: 'medium'
      }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      max_output_tokens: 240,
      store: false,
      input: job.prompt
    }),
    signal: AbortSignal.timeout(options.timeoutMs || 90000)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI Web Search HTTP ${response.status}: ${message.slice(0, 300)}`);
  }
  return response.json();
}
