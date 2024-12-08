import { statSync, copyFileSync, mkdirSync, rmSync, unlink } from 'fs';
import { EXPORT_AVIF, EXPORT_WEBP, IGNORE_PATHS, TEMP_DIR } from '../constants';
import { OptimizedFileResult } from '../image-optimizer';
import { log } from './logger-utils';
import { globSync } from 'glob';

export function formatSize(bytes?: number): string {
  if (!bytes) {
    return 'n/a';
  }

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1000));
  const size = bytes / Math.pow(1000, i);
  return `${i === 0 ? size : size.toFixed(2)} ${sizes[i]}`;
}

export function getPercentageChange(before: number, after?: number): number {
  const change = (((after || 0) - before) / before) * 100;
  return change;
}

export function findAllFiles(dir: string): string[] {
  log('IGNORE_PATHS');
  IGNORE_PATHS.forEach((path) => log(path));

  const ignorePatterns = IGNORE_PATHS.map((pattern) => `${dir}/${pattern}`);
  const files = globSync(`${dir}/**/*`, {
    ignore: ignorePatterns,
    nodir: true,
  });
  return files;
}

// create a function copy src file to dest file creating directories if needed
export function copyFile(src: string, dest: string) {
  log(`Copying file: ${src} to ${dest}`);
  const destDir = dest.substring(0, dest.lastIndexOf('/'));
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
}

export function moveSignificantFilesSync(
  significantFileChanges: OptimizedFileResult[]
) {
  for (const item of significantFileChanges) {
    const tempFilename = `${TEMP_DIR}/${item.fileName}`;
    log(`Moving file: ${tempFilename} to ${item.fileName}`);
    copyFileSync(tempFilename, item.fileName);
  }

  // delete the temp dir
  rmSync(TEMP_DIR, { recursive: true });
}

export function checkBeforeFileSizes(
  dataMap: Map<string, OptimizedFileResult>,
  tempImageFileNames: string[]
) {
  // check sizes before
  for (const fileName of tempImageFileNames) {
    const fileSizeBefore = statSync(fileName).size;

    log(`temp image: ${fileName}, size: ${formatSize(fileSizeBefore)}`);
    const originalFileName = fileName.replace(`${TEMP_DIR}/`, '');
    dataMap.set(originalFileName, {
      fileName: originalFileName,
      fileSizeBefore,
      percentageChange: 0,
    });

    const imageExportMap = {
      png: [
        { flag: EXPORT_WEBP, extension: 'webp' },
        { flag: EXPORT_AVIF, extension: 'avif' },
      ],
      jpg: [
        { flag: EXPORT_WEBP, extension: 'webp' },
        { flag: EXPORT_AVIF, extension: 'avif' },
      ],
      jpeg: [
        { flag: EXPORT_WEBP, extension: 'webp' },
        { flag: EXPORT_AVIF, extension: 'avif' },
      ],
      gif: [{ flag: EXPORT_WEBP, extension: 'webp' }],
      webp: [{ flag: EXPORT_AVIF, extension: 'avif' }],
    };

    for (const [extension, exportedFormats] of Object.entries(imageExportMap)) {
      const fileExtension = `.${extension}`;
      if (originalFileName.endsWith(fileExtension)) {
        for (const exportedFormat of exportedFormats) {
          if (!exportedFormat.flag) {
            continue;
          }

          const exportedFormatFileExtension = `.${exportedFormat.extension}`;
          const newFileName = originalFileName.replace(
            fileExtension,
            exportedFormatFileExtension
          );
          dataMap.set(newFileName, {
            fileName: newFileName,
            fileSizeBefore,
            percentageChange: 0,
          });
        }
      }
    }
  }
}

export function checkFileSizesAfter(
  dataMap: Map<string, OptimizedFileResult>
): boolean {
  let changed = false;
  for (const item of dataMap.values()) {
    const tempFilename = `${TEMP_DIR}/${item.fileName}`;
    if (!statSync(tempFilename)) {
      continue;
    }

    const fileSize = statSync(tempFilename).size;
    item.fileSizeAfter = fileSize;
    const percentageChange = getPercentageChange(item.fileSizeBefore, fileSize);
    item.percentageChange = percentageChange;
    if (percentageChange < -1) {
      item.isChangeSignificant = true;
      changed = true;
    }
  }

  return changed;
}

export async function deleteFiles(filePaths: string[]) {
  const deletePromises = filePaths.map((file) => {
    return unlink(file, () => {});
  });
  await Promise.all(deletePromises);
}

export function copyFilesToTempDirSync(filePaths: string[]) {
  for (const filePath of filePaths) {
    copyFile(filePath, `${TEMP_DIR}/${filePath}`);
  }
}
