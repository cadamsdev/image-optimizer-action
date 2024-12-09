import { PR_BODY_CHAR_LIMIT } from './constants';
import { OptimizedFileResult } from './image-optimizer';
import { formatSize } from './utils/file-utils';
import { info, setOutput } from '@actions/core';
import { table } from 'table';
import { log } from './utils/logger-utils';
import { getJobUrl } from './api/github';

export interface ReportData {
  markdownReport: string;
  terminalReport: string;
}

export async function generateReport(
  data: OptimizedFileResult[]
): Promise<ReportData> {
  const sortedData = Array.from(data).sort((a, b) => {
    return a.fileName.localeCompare(b.fileName);
  });

  const totalSaved = sortedData.reduce(
    (acc, item) => acc + item.fileSizeBefore - (item.fileSizeAfter || 0),
    0
  );

  let markdownReport = await generateMarkdownReport(sortedData, totalSaved);
  if (markdownReport.length > PR_BODY_CHAR_LIMIT) {
    markdownReport = await generateShortMarkdownReport(sortedData, totalSaved);
  }

  const terminalReport = await generateTerminalReport(sortedData, totalSaved);
  return { markdownReport, terminalReport };
}

async function generateMarkdownReport(
  data: OptimizedFileResult[],
  totalSaved: number
): Promise<string> {
  const description = `Optimized <b>${data.length}</b> ${
    data.length > 1 ? 'images' : 'image'
  }, saved <b>${formatSize(totalSaved)}</b> in total.\n\n`;
  const header = `| Filename | Before | After | Difference |\n| ---- | ------ | ----- | ----------- |\n`;
  const rows = data
    .map(
      (item) =>
        `| ${item.fileName} | ${formatSize(item.fileSizeBefore)} | ${formatSize(
          item.fileSizeAfter
        )} | ${item.percentageChange.toFixed(2) + '%'} |\n`
    )
    .join('');
  const markdown = description + header + rows;
  setOutput('markdown_report', markdown);
  return markdown;
}

async function generateTerminalReport(
  data: OptimizedFileResult[],
  totalSaved: number
): Promise<string> {
  const columns = ['Filename', 'Before', 'After', 'Difference'];
  const rows = data.map((item) => [
    item.fileName,
    formatSize(item.fileSizeBefore),
    formatSize(item.fileSizeAfter),
    item.percentageChange.toFixed(2) + '%',
  ]);

  const dataForTable = [columns, ...rows];
  const terminalTableOutput = table(dataForTable);

  const terminalReport =
    `Optimized ${data.length} ${
      data.length > 1 ? 'images' : 'image'
    }, saved ${formatSize(totalSaved)} in total` +
    '\n' +
    terminalTableOutput;

  info(terminalReport);
  return terminalReport;
}

async function generateShortMarkdownReport(
  data: OptimizedFileResult[],
  totalSaved: number
): Promise<string> {
  const jobUrl = await getJobUrl();
  log(`runUrl=${jobUrl}`);
  const description = `Optimized <b>${
    data.length
  }</b> images, saved <b>${formatSize(totalSaved)}</b> in total.\n\n`;
  const description2 = `Report too large. View the full report [here](${jobUrl}).`;
  const markdown = description + description2;
  setOutput('markdown_report', markdown);
  return markdown;
}
