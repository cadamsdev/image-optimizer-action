import { setFailed } from '@actions/core';
import { GITHUB_TOKEN } from './constants';
import { createPRComment, getEventData, getPRFileNames } from './api/github';
import { log } from 'console';
import { checkoutBranch, commitAndPush, setupGitConfig } from './api/git';
import { findAllFiles } from './utils/file-utils';
import { getImageProcessorConfig, processImages } from './image-optimizer';
import { generateReport } from './report';

export async function main(): Promise<void> {
  try {
    if (!GITHUB_TOKEN) {
      setFailed('GitHub token is required');
      return;
    }

    const eventData = getEventData();
    log(`event: ${eventData.eventName}`);

    let allFiles: string[] = [];
    const branchName = process.env.GITHUB_HEAD_REF || '';

    if (eventData.isWorkflowDispatch || eventData.isScheduled) {
      allFiles = findAllFiles('.');
    } else if (eventData.isPullRequest) {
      await setupGitConfig();
      log(`Branch name: ${branchName}`);
      if (!branchName) {
        setFailed('No branch name found');
        return;
      }

      await checkoutBranch(branchName);
      allFiles = await getPRFileNames();
    }

    const ipConfig = getImageProcessorConfig(allFiles);
    log(`Optimizing ${ipConfig.imagesToCompress.length} images`);

    const results = await processImages(ipConfig);
    if (results.length === 0) {
      log('No images optimized');
      return;
    }

    const { markdownReport } = await generateReport(results);

    if (eventData.isPullRequest) {
      await commitAndPush(branchName);

      if (markdownReport) {
        await createPRComment(markdownReport);
      }
    }
  } catch (error: any) {
    setFailed(error.message);
  }
}

main();
