# 汽车日报内容数据化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current local prototype read daily reports and launch calendar entries from validated, structured content files instead of data embedded in UI code.

**Architecture:** `data/reports.js` exports report objects keyed by ISO date and `data/launches.js` exports entries keyed by ISO month. `app.js` imports those objects, renders lists and details, and never owns editorial copy. A small Node validation script checks required fields, multi-tag arrays, and date/month keys before content is published locally.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node.js built-in test runner.

## Global Constraints

- Keep the existing light visual design and all click-to-detail interactions.
- A story must retain source name, source URL field, published time, brand, tags, summary, and detail text.
- `tags` is an array, never a comma-delimited string.
- Launch status is one of `launched`, `confirmed`, or `estimated`.
- No external service, database, or automatic collection is introduced in this phase.

---

### Task 1: Define reusable report and story records

**Files:**
- Create: `data/reports.js`
- Modify: `app.js`
- Test: `tests/content-data.test.mjs`

**Interfaces:**
- Produces `reportsByDate: Record<string, DailyReport>`.
- `DailyReport` has `dateLabel: string`, `highlights: Story[]`, `brands: Record<string, Story[]>`, and `industry: Story[]`.
- `Story` has `id`, `tags`, `title`, `summary`, `detail`, `sourceName`, `sourceUrl`, and `publishedAt`.

- [ ] **Step 1: Write a failing structure test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { reportsByDate } from '../data/reports.js';

test('each story has auditable editorial fields', () => {
  for (const report of Object.values(reportsByDate)) {
    for (const story of [...report.highlights, ...report.industry, ...Object.values(report.brands).flat()]) {
      assert.ok(story.id);
      assert.ok(Array.isArray(story.tags) && story.tags.length > 0);
      assert.ok(story.title && story.summary && story.detail);
      assert.ok(story.sourceName && 'sourceUrl' in story && story.publishedAt);
    }
  }
});
```

- [ ] **Step 2: Run the test before implementation**

Run: `node --test tests/content-data.test.mjs`

Expected: FAIL because `data/reports.js` does not exist.

- [ ] **Step 3: Create the report module and change render inputs**

```js
export const reportsByDate = {
  '2026-09-10': {
    dateLabel: '2026年9月10日 · 星期四',
    highlights: [{ id: 'huawei-preview', tags: ['新车', '产品'], title: '...', summary: '...', detail: '...', sourceName: '品牌官方渠道', sourceUrl: '', publishedAt: '2026-09-10' }],
    brands: { '鸿蒙智行': [] },
    industry: []
  }
};
```

Replace tuple destructuring in `renderReport()` with `story.tags`, `story.title`, `story.summary`, and `story.sourceName`.

- [ ] **Step 4: Run the content test**

Run: `node --test tests/content-data.test.mjs`

Expected: PASS.

### Task 2: Define launch-calendar records and details

**Files:**
- Create: `data/launches.js`
- Modify: `app.js`
- Modify: `tests/content-data.test.mjs`

**Interfaces:**
- Produces `launchesByMonth: Record<string, Launch[]>`.
- `Launch` has `id`, `dateText`, `brand`, `model`, `kind`, `powertrain`, `priceText`, `status`, `statusLabel`, `sourceName`, `sourceUrl`, and `detail`.

- [ ] **Step 1: Add a failing launch-status test**

```js
import { launchesByMonth } from '../data/launches.js';

test('each launch uses a known status and has an auditable source', () => {
  const allowed = new Set(['launched', 'confirmed', 'estimated']);
  for (const launch of Object.values(launchesByMonth).flat()) {
    assert.ok(allowed.has(launch.status));
    assert.ok(launch.id && launch.sourceName && 'sourceUrl' in launch && launch.detail);
  }
});
```

- [ ] **Step 2: Run the test before implementation**

Run: `node --test tests/content-data.test.mjs`

Expected: FAIL because `data/launches.js` does not exist.

- [ ] **Step 3: Create the launch module and render named fields**

```js
export const launchesByMonth = {
  '2026-09': [{
    id: 'example-launch-c', dateText: '9月中旬', brand: '岚图', model: '示例车型 C',
    kind: '全新车型', powertrain: '增程 SUV', priceText: '待公布',
    status: 'confirmed', statusLabel: '已官宣', sourceName: '官方预告', sourceUrl: '', detail: '...'
  }]
};
```

- [ ] **Step 4: Run all data tests**

Run: `node --test tests/content-data.test.mjs`

Expected: PASS.

### Task 3: Add a local content-validation command

**Files:**
- Create: `scripts/validate-content.mjs`
- Create: `package.json`
- Modify: `tests/content-data.test.mjs`

**Interfaces:**
- `npm run validate-content` exits 0 only when all report and launch records satisfy Task 1 and Task 2 fields.

- [ ] **Step 1: Add a failing duplicate-ID test**

```js
test('story and launch IDs are globally unique', () => {
  const ids = collectAllIds(reportsByDate, launchesByMonth);
  assert.equal(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Run the test before implementing validation**

Run: `node --test tests/content-data.test.mjs`

Expected: FAIL because `collectAllIds` is not defined.

- [ ] **Step 3: Implement the validator and package script**

```json
{
  "type": "module",
  "scripts": { "validate-content": "node --test tests/content-data.test.mjs" }
}
```

```js
import { reportsByDate } from '../data/reports.js';
import { launchesByMonth } from '../data/launches.js';

const allIds = [/* report and launch IDs */];
if (new Set(allIds).size !== allIds.length) process.exitCode = 1;
```

- [ ] **Step 4: Run the publish gate**

Run: `npm run validate-content`

Expected: all tests pass and the command exits 0.
