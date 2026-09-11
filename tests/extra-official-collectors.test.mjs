import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBydRecords, parseDeepalRecords, parseLeapmotorRecords, parseZeekrRecords } from '../scripts/extra-official-collectors.mjs';

test('比亚迪保留官方标题、日期与列表给出的链接，且不把重复记录重复入库', () => {
  const record = {
    title: '比亚迪8月份销售440293辆 海外销售超18万辆，再创历史新高！',
    date: '2026-09-01 17:09:29', url: '/cn/detail634', description: ''
  };
  const items = parseBydRecords([record, record]);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, record.title);
  assert.equal(items[0].publishedAt, '2026-09-01');
  assert.equal(items[0].url, 'https://prod.byd.com/cn/detail634');
  assert.equal(items[0].sourceType, 'official');
  assert.equal(items[0].summary, undefined);
});

test('缺失或无效发布日期不能猜成今天，也不能接受非官网链接', () => {
  assert.deepEqual(parseBydRecords([
    { title: '缺日期', url: '/cn/detail634' },
    { title: '错误日期', date: '2026-02-30', url: '/cn/detail634' },
    { title: '外站', date: '2026-09-01', url: 'https://example.com/article' }
  ]), []);
});

test('深蓝使用发布日而非创建或更新日，图片正文不伪造详细文字', () => {
  const items = parseDeepalRecords([{
    id: '2065323313814773762', title: '官方公告升级 | 葡萄牙队进1球 深蓝送1车',
    publishTime: '2026-06-15 17:58:00', createdTime: '2026-06-12 14:40:25',
    updatedTime: '2026-09-10 18:04:17', brief: '',
    content: '<style>img{vertical-align:top}</style><p><img src="https://files.deepal.com.cn/a.jpg" /></p>'
  }]);
  assert.equal(items[0].publishedAt, '2026-06-15');
  assert.equal(items[0].url, 'https://deepal.com.cn/policy?id=2065323313814773762');
  assert.equal(items[0].contentParagraphs, undefined);
});

test('深蓝忽略站点加载占位数据，保留实际文字段落', () => {
  const items = parseDeepalRecords([
    { id: 'nise1', title: 'nise1', publishTime: '2025-07-23 09:16:11' },
    { id: '123', title: '新闻标题', publishTime: '2026-09-01', content: '<p>第一段&nbsp;内容</p><p>第二段&amp;内容</p>' }
  ]);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].contentParagraphs, ['第一段 内容', '第二段&内容']);
});

test('极氪官网新闻使用官方列表日期和详情页正文', () => {
  const items = parseZeekrRecords([{
    newsId: '2072941833058766848', columnId: '1480482892664233984',
    newsTitle: '焕新极氪009正式上市', showTime: '2026-05-19',
    newsText: '<p>官方发布新车价格。</p><p>同步说明上市权益。</p>'
  }]);
  assert.deepEqual(items, [{
    sourceId: 'zeekr-info', sourceName: '极氪官方新闻', sourceType: 'official',
    title: '焕新极氪009正式上市', publishedAt: '2026-05-19',
    url: 'https://www.zeekrlife.com/informationDetail?columnId=1480482892664233984&newsId=2072941833058766848',
    contentParagraphs: ['官方发布新车价格。', '同步说明上市权益。']
  }]);
});

test('零跑官网新闻使用列表发布时间，并构造原始详情链接', () => {
  const items = parseLeapmotorRecords([{
    id: '184356', title: '零跑新车发布活动', releaseTime: '2026-09-10 12:30:00'
  }, {
    id: '184357', title: '无日期新闻'
  }]);
  assert.deepEqual(items, [{
    sourceId: 'leapmotor-news', sourceName: '零跑汽车资讯新闻', sourceType: 'official',
    title: '零跑新车发布活动', publishedAt: '2026-09-10',
    url: 'https://leapmotor.cn/news/news-detail.html?id=184356'
  }]);
});
