import { log } from '../utils/logger-utils';
import {
  checkBeforeFileSizes,
  checkFileSizesAfter,
  copyFilesToTempDirSync,
  findAllFiles,
  moveSignificantFilesSync,
} from '../utils/file-utils';
import {
  getFileNamesToCompress,
  getImageProcessorConfig,
  OptimizedFileResult,
  processImages,
} from '../image-optimizer';
import { TEMP_DIR } from '../constants';
import { generateReport } from '../report';

const dataMap = new Map<string, OptimizedFileResult>();
export async function run() {
  log('Running workflow dispatch');

  const allFiles = findAllFiles('.');
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
  await generateReport(significantFileChanges);
}
