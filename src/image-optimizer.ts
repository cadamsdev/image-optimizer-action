import {
  COMPRESS_AVIF,
  COMPRESS_GIF,
  COMPRESS_JPG,
  COMPRESS_PNG,
  COMPRESS_SVG,
  COMPRESS_WEBP,
  EXPORT_AVIF,
  EXPORT_WEBP,
  REPLACE_ORIGINAL_AFTER_EXPORT_WEBP,
  TEMP_DIR,
} from './constants';
import { exec } from '@actions/exec';
import { deleteFiles } from './utils/file-utils';
import { log } from './utils/logger-utils';

export interface OptimizedFileResult {
  fileName: string;
  fileSizeBefore: number;
  fileSizeAfter?: number;
  percentageChange: number;
  isChangeSignificant?: boolean;
}

export interface ImageProcessorConfig {
  jpgFileNames: string[];
  pngFileNames: string[];
  gifFileNames: string[];
  svgFileNames: string[];
  webpFileNames: string[];
  avifFileNames: string[];
}

export async function processImages({
  svgFileNames,
  avifFileNames,
  webpFileNames,
  jpgFileNames,
  pngFileNames,
  gifFileNames,
}: ImageProcessorConfig) {
  await processSvgs(svgFileNames);
  await processAvif(avifFileNames);
  await processWebp(webpFileNames);
  await processJpgs(jpgFileNames);
  await processPngs(pngFileNames);
  await processGifs(gifFileNames);
}

export function getImageProcessorConfig(allFiles: string[]) {
  const svgFileNames = allFiles.filter((filename) => filename.endsWith('.svg'));
  const pngFileNames = allFiles.filter((filename) => filename.endsWith('.png'));
  const jpgFileNames = allFiles.filter(
    (filename) => filename.endsWith('.jpg') || filename.endsWith('.jpeg')
  );
  const webpFileNames = allFiles.filter((filename) =>
    filename.endsWith('.webp')
  );
  const avifFileNames = allFiles.filter((filename) =>
    filename.endsWith('.avif')
  );
  const gifFileNames = allFiles.filter((filename) => filename.endsWith('.gif'));

  log(`SVG files: ${svgFileNames.length}`);
  log(`PNG files: ${pngFileNames.length}`);
  log(`JPG files: ${jpgFileNames.length}`);
  log(`WEBP files: ${webpFileNames.length}`);
  log(`AVIF files: ${avifFileNames.length}`);
  log(`GIF files: ${gifFileNames.length}`);

  return {
    jpgFileNames,
    pngFileNames,
    gifFileNames,
    svgFileNames,
    webpFileNames,
    avifFileNames,
  };
}

export function getFileNamesToCompress(config: ImageProcessorConfig): string[] {
  const allImageFileNames: string[] = [];
  const compressionMappings = [
    { flag: COMPRESS_SVG, fileNames: config.svgFileNames },
    { flag: COMPRESS_PNG, fileNames: config.pngFileNames },
    { flag: COMPRESS_JPG, fileNames: config.jpgFileNames },
    { flag: COMPRESS_WEBP, fileNames: config.webpFileNames },
    { flag: COMPRESS_AVIF, fileNames: config.avifFileNames },
    { flag: COMPRESS_GIF, fileNames: config.gifFileNames },
  ];

  for (const { flag, fileNames } of compressionMappings) {
    if (flag) {
      allImageFileNames.push(...fileNames);
    }
  }

  return allImageFileNames;
}

async function processSvgs(svgFileNames: string[]) {
  if (!svgFileNames.length) {
    return;
  }

  if (!COMPRESS_SVG) {
    return;
  }

  try {
    await exec(`svgo --multipass -r ${TEMP_DIR}`);
  } catch (error) {
    console.error(`Error processing svgs:`, error);
  }
}

async function processWebp(webpFileNames: string[]) {
  if (!webpFileNames.length) {
    return;
  }

  if (EXPORT_AVIF) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.webp -f avif -o {dir}`);
    } catch (error) {
      console.error(`Error exporting avifs:`, error);
    }
  }

  if (COMPRESS_WEBP) {
    try {
      await exec(
        `sharp -i ${TEMP_DIR}/**/*.webp -o {dir} --animated --nearLossless`
      );
    } catch (error) {
      console.error(`Error exporting webps:`, error);
    }
  }
}

async function processAvif(avifFileNames: string[]) {
  if (!avifFileNames.length) {
    return;
  }

  if (COMPRESS_AVIF) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.avif -o {dir}`);
    } catch (error) {
      console.error(`Error exporting avifs:`, error);
    }
  }
}

async function processJpgs(jpgFiles: string[]) {
  if (!jpgFiles.length) {
    return;
  }

  if (EXPORT_WEBP) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.{jpg,jpeg} -f webp -o {dir}`);
    } catch (error) {
      console.error(`Error converting jpg into webp:`, error);
    }
  }

  if (EXPORT_AVIF) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.{jpg,jpeg} -f avif -o {dir}`);
    } catch (error) {
      console.error(`Error converting jpg avif:`, error);
    }
  }

  if (EXPORT_WEBP && REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    try {
      log('Deleting original jpgs');
      await deleteFiles(jpgFiles);
    } catch (error) {
      console.error(`Error deleting original jpgs:`, error);
    }
  } else if (COMPRESS_JPG) {
    try {
      await exec(
        `sharp -i ${TEMP_DIR}/**/*.{jpg,jpeg} -f jpg -o {dir} --progressive`
      );
    } catch (error) {
      console.error(`Error exporting jpgs:`, error);
    }
  }
}

async function processPngs(pngFiles: string[]) {
  if (!pngFiles.length) {
    return;
  }

  if (EXPORT_WEBP) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.png -f webp -o {dir}`);
    } catch (error) {
      console.error(`Error exporting webps:`, error);
    }
  }

  if (EXPORT_AVIF) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.png -f avif -o {dir}`);
    } catch (error) {
      console.error(`Error exporting avifs:`, error);
    }
  }

  if (EXPORT_WEBP && REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    try {
      log('Deleting original pngs');
      await deleteFiles(pngFiles);
    } catch (error) {
      console.error(`Error deleting original pngs:`, error);
    }
  } else if (COMPRESS_PNG) {
    try {
      await exec(`sharp -i ${TEMP_DIR}/**/*.png -o {dir}`);
    } catch (error) {
      console.error(`Error processing pngs:`, error);
    }
  }
}

async function processGifs(gifFiles: string[]) {
  if (!gifFiles.length) {
    return;
  }

  if (EXPORT_WEBP) {
    try {
      await exec(
        `sharp -i ${TEMP_DIR}/**/*.gif -f webp -o {dir} --animated --nearLossless`
      );
    } catch (error) {
      console.error(`Error exporting webps:`, error);
    }
  }

  if (EXPORT_WEBP && REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    try {
      log('Deleting original gifs');
      await deleteFiles(gifFiles);
    } catch (error) {
      console.error(`Error deleting original gifs:`, error);
    }
  } else if (COMPRESS_GIF) {
    try {
      await exec(
        `sharp -i ${TEMP_DIR}/**/*.gif -o {dir} --animated --nearLossless`
      );
    } catch (error) {
      console.error(`Error processing gifs:`, error);
    }
  }
}
