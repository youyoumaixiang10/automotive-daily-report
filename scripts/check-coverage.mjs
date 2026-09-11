import { officialSocialCoverage } from '../data/official-social.js';
import { monitoringCoverage } from '../data/monitoring-coverage.js';
import { sourceRegistry } from '../data/sources.js';

const verifiedSocialBrands = new Set(sourceRegistry
  .filter(source => source.sourceType === 'official-social')
  .flatMap(source => source.brands));
const verifiedSocial = officialSocialCoverage.filter(item => verifiedSocialBrands.has(item.brand)).length;
const adaptedBrands = new Set(sourceRegistry
  .filter(source => source.autoCollect)
  .flatMap(source => source.brands)).size;

console.table([
  { layer: '官网 + 垂直媒体入口', complete: `${monitoringCoverage.length}/${monitoringCoverage.length}`, state: '已覆盖' },
  { layer: '官方自媒体账号核验', complete: `${verifiedSocial}/${officialSocialCoverage.length}`, state: verifiedSocial === officialSocialCoverage.length ? '已覆盖' : '进行中' },
  { layer: '官网自动读取适配', complete: `${adaptedBrands}/${monitoringCoverage.length}`, state: '进行中' }
]);
