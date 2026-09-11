import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAutohomeNews, parseAvatrNews, parseLiAutoNews, parseMiitAutoNews, parseNioNewsLinks, parseOnvoNews } from '../scripts/pilot-collectors.mjs';

test('parses official Li Auto list entries into review candidates', () => {
  const html = '<a href="/news/186.html">新一代理想MEGA正式上市，售价50.98万元 --> 2026年09月02日</a>';
  assert.deepEqual(parseLiAutoNews(html), [{
    sourceId: 'li-auto-news', sourceName: '理想汽车媒体中心', sourceType: 'official',
    title: '新一代理想MEGA正式上市，售价50.98万元', publishedAt: '2026-09-02', url: 'https://www.lixiang.com/news/186.html'
  }]);
});

test('parses official AVATR list entries into review candidates', () => {
  const html = '<a href="/news?newsChId=abc&amp;newsEngId=">阿维塔9系亮相工信部公告 2026 年 9 月 8 日</a>';
  assert.deepEqual(parseAvatrNews(html), [{
    sourceId: 'avatr-news', sourceName: '阿维塔新闻中心', sourceType: 'official',
    title: '阿维塔9系亮相工信部公告', publishedAt: '2026-09-08', url: 'https://www.avatr.com/news?newsChId=abc&newsEngId='
  }]);
});

test('parses official ONVO list entries into review candidates', () => {
  const html = '<a href="/news/20260611001">2026-06-11 中型SUV科技旗舰，新乐道L60售价19.28万元起</a>';
  assert.deepEqual(parseOnvoNews(html), [{
    sourceId: 'onvo-about', sourceName: '乐道最新动态', sourceType: 'official',
    title: '中型SUV科技旗舰，新乐道L60售价19.28万元起', publishedAt: '2026-06-11', url: 'https://www.onvo.cn/news/20260611001'
  }]);
});

test('parses automotive MIIT announcements into industry candidates', () => {
  const html = '<li><span>2026-09-09</span><p><a href="/zwgk/wjgs/art/2026/a.html">关于《道路机动车辆生产企业及产品公告》（第411批）拟发布内容的公示</a></p></li>';
  assert.deepEqual(parseMiitAutoNews(html), [{
    sourceId: 'miit', sourceName: '工业和信息化部', sourceType: 'government',
    title: '关于《道路机动车辆生产企业及产品公告》（第411批）拟发布内容的公示', publishedAt: '2026-09-09', url: 'https://www.miit.gov.cn/zwgk/wjgs/art/2026/a.html'
  }]);
});

test('parses NIO browser-rendered cards into review candidates', () => {
  const links = [{ href: 'https://www.nio.com/news/20260901001', text: 'NIO Inc. Achieves 14.5% YoY, with 35,836 Deliveries in August\n\n2026-09-01' }];
  assert.deepEqual(parseNioNewsLinks(links), [{
    sourceId: 'nio-official', sourceName: '蔚来新闻中心', sourceType: 'official',
    title: 'NIO Inc. Achieves 14.5% YoY, with 35,836 Deliveries in August', publishedAt: '2026-09-01', url: 'https://www.nio.com/news/20260901001'
  }]);
});

test('parses Autohome headlines only as media discovery candidates', () => {
  const html = '<a href="//www.autohome.com.cn/news/202609/1317013.html#pvareaid=102625">小米澎程N90 Max售26.99万起</a>';
  assert.deepEqual(parseAutohomeNews(html), [{
    sourceId: 'autohome-news', sourceName: '汽车之家资讯', sourceType: 'vertical-media',
    title: '小米澎程N90 Max售26.99万起', sourceMonth: '2026-09', url: 'https://www.autohome.com.cn/news/202609/1317013.html'
  }]);
});
