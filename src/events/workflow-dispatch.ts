import { log } from '../utils/logger-utils';
import { findAllFiles } from '../utils/file-utils';
import { getImageProcessorConfig, processImages } from '../image-optimizer';
import { generateReport } from '../report';

export async function run() {
  log('Running workflow dispatch');

  const allFiles = findAllFiles('.');
  const ipConfig = getImageProcessorConfig(allFiles);
  log(`Optimizing ${ipConfig.imagesToCompress.length} images`);

  const results = await processImages(ipConfig);

  if (results.length === 0) {
    log('No images optimized');
    return;
  }

  await generateReport(results);
}
