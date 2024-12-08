import { log } from '../utils/logger-utils';
import {
  getFileNamesToCompress,
  getImageProcessorConfig,
  OptimizedFileResult,
  processImages,
} from '../image-optimizer';
import { createPRComment, getPRFileNames } from '../api/github';
import { TEMP_DIR } from '../constants';
import {
  checkBeforeFileSizes,
  checkFileSizesAfter,
  copyFilesToTempDirSync,
  moveSignificantFilesSync,
} from '../utils/file-utils';
import { setFailed } from '@actions/core';
import { generateReport } from '../report';
import { checkoutBranch, commitAndPush, setupGitConfig } from '../api/git';

const dataMap = new Map<string, OptimizedFileResult>();

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
  const fileNamesToCompress = getFileNamesToCompress(ipConfig);
  if (!fileNamesToCompress.length) {
    log('No images to optimize');
    return;
  }

  log(`Optimizing ${fileNamesToCompress.length} images`);
  copyFilesToTempDirSync(fileNamesToCompress);

  const tempImageFileNames = fileNamesToCompress.map(
    (file) => `${TEMP_DIR}/${file}`
  );

  await checkBeforeFileSizes(dataMap, tempImageFileNames);
  await processImages(ipConfig);

  const changed = checkFileSizesAfter(dataMap);
  if (!changed) {
    log('No changes in file sizes');
    return;
  }

  const significantFileChanges = Array.from(dataMap.values()).filter(
    (item) => item.isChangeSignificant
  );

  moveSignificantFilesSync(significantFileChanges);

  const { markdownReport } = await generateReport(significantFileChanges);
  await commitAndPush(branchName);

  if (markdownReport) {
    await createPRComment(markdownReport);
  }
}
