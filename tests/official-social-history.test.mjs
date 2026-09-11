import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialSocialHistory } from '../scripts/backfill-official-social.mjs';

test('official social history keeps only verified posts from the requested account and window', () => {
  const account = { sourceId: 'test', sourceName: '测试官方微博', name: '测试品牌', uid: '123' };
  const data = { data: { list: [
    { created_at: 'Wed Sep 09 10:30:00 +0800 2026', mblogid: 'abc', text_raw: '测试品牌发布新车信息', isLongText: false, user: { id: 123, verified: true } },
    { created_at: 'Wed Sep 09 10:30:00 +0800 2026', mblogid: 'def', text_raw: '非官方内容', user: { id: 456, verified: true } },
    { created_at: 'Wed Aug 26 10:30:00 +0800 2026', mblogid: 'ghi', text_raw: '过早内容', user: { id: 123, verified: true } }
  ] } };
  const items = parseOfficialSocialHistory(data, account, '2026-09-01', '2026-09-10');
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://weibo.com/123/abc');
  assert.equal(items[0].publishedTime, '2026-09-09T10:30:00+08:00');
});
