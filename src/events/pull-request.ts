import { log } from '../utils/logger-utils';
import { getImageProcessorConfig, processImages } from '../image-optimizer';
import { createPRComment, getPRFileNames } from '../api/github';
import { setFailed } from '@actions/core';
import { generateReport } from '../report';
import { checkoutBranch, commitAndPush, setupGitConfig } from '../api/git';

export async function run() {
  log('Running pull request');
  await setupGitConfig();

  const branchName = process.env.GITHUB_HEAD_REF;
  log(`Branch name: ${branchName}`);
  if (!branchName) {
    setFailed('No branch name found');
    return;
  }

  await checkoutBranch(branchName);

  const allFiles = await getPRFileNames();
  const ipConfig = getImageProcessorConfig(allFiles);

  log(`Optimizing ${ipConfig.imagesToCompress.length} images`);

  const results = await processImages(ipConfig);

  if (results.length === 0) {
    log('No images optimized');
    return;
  }

  const { markdownReport } = await generateReport(results);
  await commitAndPush(branchName);

  if (markdownReport) {
    await createPRComment(markdownReport);
  }
}
