import { readJson } from './content-utils.mjs';
import { validateReports } from './report-builder.mjs';
import { sourceRegistry } from '../data/sources.js';
const reportsByDate = readJson(new URL('../runtime/generated-reports.json', import.meta.url), {});
const launches = readJson(new URL('../runtime/generated-launches.json', import.meta.url), []);
validateReports(reportsByDate, launches);

const reportStories = Object.values(reportsByDate).flatMap(report => [
  ...report.highlights,
  ...report.otherBrands,
  ...report.industry,
  ...Object.values(report.brands).flat()
]);
const reportIds = reportStories.map(story => story.id);
const launchIds = launches.map(launch => launch.id);
const ids = [...new Set(reportIds), ...launchIds];

if (new Set(ids).size !== ids.length) {
  console.error('Content validation failed: duplicate story or launch ID.');
  process.exitCode = 1;
} else {
  console.log(`Content validation passed: ${new Set(reportIds).size} stories, ${launchIds.length} launches, and ${sourceRegistry.length} input sources.`);
}
