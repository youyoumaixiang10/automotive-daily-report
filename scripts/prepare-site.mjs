import { cpSync, mkdirSync, rmSync } from 'node:fs';

const destination = new URL('../site/', import.meta.url);
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', 'summary.css', 'section-styles.css', 'section-refresh.css', 'accent.css', 'layout-fixes.css', 'date-calendar.css', 'live-data.css']) cpSync(new URL(`../${file}`, import.meta.url), new URL(file, destination));
cpSync(new URL('../data/view-utils.js', import.meta.url), new URL('data/view-utils.js', destination));
for (const file of ['generated-reports.json', 'generated-launches.json', 'public-status.json']) cpSync(new URL(`../runtime/${file}`, import.meta.url), new URL(`runtime/${file}`, destination));
console.log('已准备可发布静态站点。');
