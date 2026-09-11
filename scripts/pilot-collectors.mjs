const decode = value => value
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;|&#xA0;/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const uniqueByUrl = items => [...new Map(items.map(item => [item.url, item])).values()];
const collapseRepeatedText = value => value.replace(/^(.+?)\s+\1$/u, '$1');

export function parseLiAutoNews(html) {
  const candidates = [...html.matchAll(/<a[^>]+href=["'](\/news\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const raw = decode(match[2]);
      const date = raw.match(/(20\d{2})年(\d{2})月(\d{2})日/)?.slice(1).join('-');
      const title = collapseRepeatedText(raw.replace(/--?>?\s*20\d{2}年\d{2}月\d{2}日.*/u, '').trim());
      return title && date ? {
        sourceId: 'li-auto-news',
        sourceName: '理想汽车媒体中心',
        sourceType: 'official',
        title,
        publishedAt: date,
        url: `https://www.lixiang.com${match[1]}`
      } : null;
    })
    .filter(Boolean);
  return uniqueByUrl(candidates);
}

export function parseAvatrNews(html) {
  const candidates = [...html.matchAll(/<a[^>]+href=["'](\/news\?[^"']*newsChId=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const raw = decode(match[2]);
      const dateMatch = raw.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      const title = raw.replace(/20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日.*/u, '').trim();
      return title && dateMatch ? {
        sourceId: 'avatr-news',
        sourceName: '阿维塔新闻中心',
        sourceType: 'official',
        title,
        publishedAt: `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`,
        url: `https://www.avatr.com${decode(match[1])}`
      } : null;
    })
    .filter(Boolean);
  return uniqueByUrl(candidates);
}

export function parseOnvoNews(html) {
  const candidates = [...html.matchAll(/<a[^>]+href=["'](\/news\/\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const raw = decode(match[2]);
      const dateMatch = raw.match(/(20\d{2})-(\d{2})-(\d{2})/);
      const title = raw.replace(/^20\d{2}-\d{2}-\d{2}\s*/u, '').trim();
      return title && dateMatch ? {
        sourceId: 'onvo-about',
        sourceName: '乐道最新动态',
        sourceType: 'official',
        title,
        publishedAt: dateMatch[0],
        url: `https://www.onvo.cn${match[1]}`
      } : null;
    })
    .filter(Boolean);
  return uniqueByUrl(candidates);
}

export function parseMiitAutoNews(html) {
  const candidates = [...html.matchAll(/<li>\s*<span>(20\d{2}-\d{2}-\d{2})<\/span>\s*<p><a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({
      sourceId: 'miit',
      sourceName: '工业和信息化部',
      sourceType: 'government',
      title: decode(match[3]),
      publishedAt: match[1],
      url: `https://www.miit.gov.cn${match[2]}`
    }))
    .filter(candidate => /汽车|机动车|新能源|车船|动力电池|车路协同/u.test(candidate.title));
  return uniqueByUrl(candidates);
}

export function parseNioNewsLinks(links) {
  return links.map(link => {
    const parts = link.text.split(/\s*\n\s*/).filter(Boolean);
    const publishedAt = parts.at(-1);
    return {
      sourceId: 'nio-official',
      sourceName: '蔚来新闻中心',
      sourceType: 'official',
      title: parts.slice(0, -1).join(' '),
      publishedAt,
      url: link.href
    };
  }).filter(candidate => /^20\d{2}-\d{2}-\d{2}$/.test(candidate.publishedAt) && candidate.title);
}

export function parseAutohomeNews(html) {
  const candidates = [...html.matchAll(/<a[^>]+href=["']([^"']*\/news\/(20\d{2})(\d{2})\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const title = decode(match[4]).replace(/\s+(?:\d+\s*(?:分钟前|小时前|天前)|昨天|刚刚)\s+[\s\S]*$/u, '').trim();
      const url = match[1].replace(/#.*/u, '');
      return title ? {
        sourceId: 'autohome-news',
        sourceName: '汽车之家资讯',
        sourceType: 'vertical-media',
        title,
        sourceMonth: `${match[2]}-${match[3]}`,
        url: url.startsWith('//') ? `https:${url}` : url
      } : null;
    })
    .filter(Boolean);
  return uniqueByUrl(candidates);
}
