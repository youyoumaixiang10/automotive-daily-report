import { monitoringCoverage } from '../data/monitoring-coverage.js';
import { sourceRegistry } from '../data/sources.js';
import { readJson, writeJson } from './content-utils.mjs';

const dir = new URL('../runtime/', import.meta.url);
const sourceResults = ['candidates.json', 'discovery-candidates.json', 'search-candidates.json']
  .flatMap(file => readJson(new URL(file, dir), {}).sourceResults || []);
const resultById = new Map(sourceResults.map(result => [result.sourceId, result]));
const webSearch = readJson(new URL('openai-search-candidates.json', dir), { providerStatus: 'unavailable', queryRuns: [] });
const webSearchByBrand = new Map((webSearch.queryRuns || []).filter(run => run.brand).map(run => [run.brand, run]));
const healthy = result => result?.status === 'ok' || (result?.status === 'no-recent-updates' && result.listRead === true);
const available = result => healthy(result) || result?.status === 'partial';

const brands = monitoringCoverage.map(coverage => {
  const statuses = ids => ids.map(id => ({ id, ...(resultById.get(id) || { status: 'pending' }) }));
  const officialStatuses = statuses(coverage.officialSourceIds);
  const socialStatuses = statuses(sourceRegistry
    .filter(source => source.sourceType === 'official-social' && source.brands.includes(coverage.brand))
    .map(source => source.id));
  const discoveryStatuses = statuses(coverage.discoverySourceIds);
  const officialReady = officialStatuses.some(healthy);
  const socialComplete = socialStatuses.some(item => item.status === 'ok');
  const discoveryReady = discoveryStatuses.some(available);
  return {
    brand: coverage.brand,
    webSearchStatus: webSearchByBrand.get(coverage.brand) || { status: 'pending', sourceCount: 0 },
    state: officialReady && socialComplete && discoveryReady && webSearchByBrand.get(coverage.brand)?.status === 'completed' ? 'complete' :
      officialReady || socialStatuses.some(available) || discoveryReady || webSearchByBrand.get(coverage.brand)?.status === 'completed' ? 'partial' : 'unavailable',
    officialStatuses, socialStatuses, discoveryStatuses
  };
});
const media = sourceRegistry.filter(source => source.sourceType === 'vertical-media').map(source => ({
  id: source.id, name: source.name, ...(resultById.get(source.id) || { status: 'pending' })
}));
const policy = sourceRegistry.filter(source => source.sourceType === 'government').map(source => ({
  id: source.id, name: source.name, ...(resultById.get(source.id) || { status: 'pending' })
}));
const reviewQueue = readJson(new URL('review-queue.json', dir), []);
const completeBrands = brands.filter(item => item.state === 'complete').length;
const healthyMedia = media.filter(healthy).length;
const audit = {
  checkedAt: new Date().toISOString(),
  passed: completeBrands === brands.length && healthyMedia >= 3 && policy.some(healthy),
  summary: {
    completeBrands, totalBrands: brands.length, healthyMedia, totalMedia: media.length,
    policyHealthy: policy.some(healthy), unresolvedCandidates: reviewQueue.length
  },
  brands, media, policy,
  webSearch: { providerStatus: webSearch.providerStatus, queryRuns: webSearch.queryRuns || [] },
  rule: '配置了来源不等于完成覆盖；只有官方渠道、官方自媒体和媒体发现层均达到健康状态，品牌才计为完整。'
};
writeJson(new URL('coverage-audit.json', dir), audit);
console.log(JSON.stringify(audit.summary, null, 2));
if (!audit.passed) console.warn('本轮来源覆盖不足，日报只能视为已核验信息子集。');
