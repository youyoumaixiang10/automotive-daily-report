import { monitoringCoverage } from '../data/monitoring-coverage.js';
import { sourceRegistry } from '../data/sources.js';
import { issueSearchDates } from './content-utils.mjs';

const searchableSources = sourceRegistry.filter(source => ['official', 'official-social', 'government', 'vertical-media'].includes(source.sourceType));

function sourceHosts(source) {
  return (source.hosts || [new URL(source.url).hostname]).map(host => host.replace(/^www\./u, ''));
}

export const allowedDomains = [...new Set(searchableSources.flatMap(sourceHosts))];

const mediaSweepGroups = [
  ['autohome-news', 'autohome-industry', 'dongchedi-news', 'yiche-news', 'pcauto-news', 'news18a-auto'],
  ['sina-auto', 'ifeng-auto', 'sohu-auto', 'netease-auto', 'ithome-auto', 'xchuxing-auto'],
  ['cailianpress-auto', 'nbd-auto', 'gasgoo-auto', 'caijing-auto', 'chezhitong-auto']
];

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
  const calendarDates = `${firstDate}、${secondDate}`;
  const brandJobs = monitoringCoverage.map(({ brand, aliases }) => ({
    id: `brand:${brand}`,
    brand,
    aliases,
    prompt: `必须调用网页搜索。分别搜索 ${calendarDates} 两个日期与品牌“${brand}”及别名“${aliases.join('、')}”相关的中国汽车新闻。重点寻找：新车上市、预售、改款、年款、新增版本、申报、技术发布、价格与促销权益、营销传播、品牌活动、销量、交付、重大回应。搜索阶段只要具体文章或帖子的页面日期属于这两个自然日即可返回，精确的 ${window} 边界由后续原文校验处理。只返回品牌官网、官方自媒体或已限定可信媒体的具体内容页；车型页、频道页、搜索页和旧闻不要返回。每条写明事实型标题、原文 URL 和页面显示的发布时间，没有符合项才返回空数组。`
  }));
  const sweepJobs = mediaSweepGroups.map((sourceIds, index) => {
    const sources = sourceIds.map(id => sourceRegistry.find(source => source.id === id)).filter(Boolean);
    return {
      id: `media-sweep:${index + 1}`,
      brand: null,
      aliases: [],
      allowedDomains: [...new Set(sources.flatMap(sourceHosts))],
      prompt: `必须调用网页搜索，逐一检查这些汽车媒体在 ${calendarDates} 发布的汽车新闻：${sources.map(source => source.name).join('、')}。覆盖全部汽车品牌的新车、改款、预售、价格权益、营销活动、销量交付、技术发布和企业重大动态，不要只寻找重点品牌。搜索阶段只要具体文章页面日期属于这两个自然日即可返回，精确的 ${window} 边界由后续原文校验处理。只返回具体文章页，不要返回首页、频道页、车型库、报价页或搜索页。每条写明基于正文概括的事实型标题、原文 URL 和页面显示的发布时间；尽可能完整返回，确认没有符合项才返回空数组。`
    };
  });
  return [...brandJobs, ...sweepJobs, {
    id: 'industry', brand: null, aliases: [],
    prompt: `必须调用网页搜索。分别搜索 ${calendarDates} 两个日期发布的中国汽车行业重要信息，重点寻找国家政策与监管、行业协会数据、召回、重大产业事件、供应链、出口与关税、充换电和动力电池。搜索阶段只要具体文章页面日期属于这两个自然日即可返回，精确的 ${window} 边界由后续原文校验处理。只返回政府、行业机构或已限定可信媒体的具体内容页；频道页、搜索页、车型普通新闻和旧闻不要返回。每条写明事实型标题、原文 URL 和页面显示的发布时间，没有符合项才返回空数组。`
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

export function isSpecificContentUrl(value, source) {
  try {
    const url = new URL(value);
    const normalized = `${url.origin}${url.pathname}`.replace(/\/+$/u, '');
    const sourceUrl = new URL(source.url);
    const sourceBase = `${sourceUrl.origin}${sourceUrl.pathname}`.replace(/\/+$/u, '');
    if (normalized === sourceBase) return false;
    if (/\/(?:news|information|newscenter|zwgk|about|newbrand|new_car|cars|hangye)?\/?$/iu.test(url.pathname)) return false;
    if (/\/(?:search|query|channel|list|index)(?:[/.]|$)/iu.test(url.pathname)) return false;
    if (source.sourceType === 'official-social' && /^\/(?:u\/)?\d+\/?$/u.test(url.pathname)) return false;
    return /\d{3,}|\.(?:s?html?|php)$/iu.test(`${url.pathname}${url.search}`);
  } catch { return false; }
}

export function structuredArticles(response) {
  const text = (response?.output || []).flatMap(item => item?.type === 'message' ? (item.content || []) : [])
    .filter(content => content.type === 'output_text')
    .map(content => content.text || '')
    .join('');
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.articles) ? parsed.articles : [];
  } catch { return []; }
}

export function hasStructuredOutput(response) {
  return (response?.output || []).some(item => item?.type === 'message' &&
    (item.content || []).some(content => content.type === 'output_text'));
}

export function candidatesFromResponse(response, job) {
  const structured = structuredArticles(response);
  const discovered = (structured.length ? structured.map(item => ({
    url: item.url, title: item.title, publishedAt: item.published_at
  })) : responseSources(response).filter(item => {
    const source = registeredSourceForUrl(item.url, job.brand);
    return source && isSpecificContentUrl(item.url, source);
  })).slice(0, structured.length ? 12 : 4);
  return discovered.flatMap(item => {
    const source = registeredSourceForUrl(item.url, job.brand);
    if (!source) return [];
    return [{
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.sourceType,
      title: item.title || `${job.brand || '汽车行业'}相关信息`,
      url: item.url,
      publishedAt: null,
      discoveryPublishedAt: item.publishedAt || null,
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
      model: options.model || process.env.SEARCH_MODEL || 'gpt-5.5',
      reasoning: { effort: 'low' },
      tools: [{
        type: 'web_search',
        filters: { allowed_domains: job.allowedDomains || allowedDomains },
        user_location: { type: 'approximate', country: 'CN', city: 'Shanghai', region: 'Shanghai' },
        search_context_size: 'medium'
      }],
      tool_choice: { type: 'web_search' },
      include: ['web_search_call.action.sources'],
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema', name: 'automotive_news_discovery', strict: true,
          schema: {
            type: 'object', additionalProperties: false, required: ['articles'],
            properties: {
              articles: {
                type: 'array', maxItems: 12,
                items: {
                  type: 'object', additionalProperties: false,
                  required: ['title', 'url', 'published_at'],
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    published_at: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      max_output_tokens: 1800,
      store: false,
      input: job.prompt
    }),
    signal: AbortSignal.timeout(options.timeoutMs || 45000)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI Web Search HTTP ${response.status}: ${message.slice(0, 300)}`);
  }
  return response.json();
}
