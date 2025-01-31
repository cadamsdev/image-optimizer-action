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
} from './constants';
import { log } from './utils/logger-utils';
import sharp from 'sharp';
import { optimize } from 'svgo';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { getPercentageChange } from './utils/file-utils';

export interface OptimizedFileResult {
  fileName: string;
  fileSizeBefore: number;
  fileSizeAfter?: number;
  percentageChange: number;
  isChangeSignificant?: boolean;
}

export interface ImageProcessorConfig {
  imagesToCompress: string[];
}

export async function processImages({
  imagesToCompress,
}: ImageProcessorConfig): Promise<OptimizedFileResult[]> {
  const results: OptimizedFileResult[] = [];
  for (let imageFileName of imagesToCompress) {
    const extension = imageFileName.substring(
      imageFileName.lastIndexOf('.') + 1
    );
    switch (extension) {
      case 'svg':
        const svgResult = processSvg(imageFileName);
        if (svgResult) {
          results.push(svgResult);
        }
        break;

      case 'gif':
        const gifResults = await processGif(imageFileName);
        results.push(...gifResults);
        break;

      case 'png':
        const pngResults = await processPng(imageFileName);
        results.push(...pngResults);
        break;

      case 'jpg':
      case 'jpeg':
        const jpgResults = await processJpg(imageFileName);
        results.push(...jpgResults);
        break;

      case 'webp':
        const webpResults = await processWebp(imageFileName);
        results.push(...webpResults);
        break;

      case 'avif':
        const avifResult = await processAvif(imageFileName);
        if (avifResult) {
          results.push(avifResult);
        }
        break;
    }
  }
  return results;
}

export function getImageProcessorConfig(
  allFiles: string[]
): ImageProcessorConfig {
  let svgCount = 0;
  let pngCount = 0;
  let jpgCount = 0;
  let gifCount = 0;
  let webpCount = 0;
  let avifCount = 0;

  const imagesToCompress: string[] = [];

  allFiles.forEach((fileName) => {
    if (COMPRESS_SVG && fileName.endsWith('.svg')) {
      imagesToCompress.push(fileName);
      svgCount++;
    } else if (COMPRESS_PNG && fileName.endsWith('.png')) {
      imagesToCompress.push(fileName);
      pngCount++;
    } else if (
      COMPRESS_JPG &&
      (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
    ) {
      imagesToCompress.push(fileName);
      jpgCount++;
    } else if (COMPRESS_GIF && fileName.endsWith('.gif')) {
      imagesToCompress.push(fileName);
      gifCount++;
    } else if (COMPRESS_WEBP && fileName.endsWith('.webp')) {
      imagesToCompress.push(fileName);
      webpCount++;
    } else if (COMPRESS_AVIF && fileName.endsWith('.avif')) {
      imagesToCompress.push(fileName);
      avifCount++;
    }
  });

  log(`SVG files: ${svgCount}`);
  log(`PNG files: ${pngCount}`);
  log(`JPG files: ${jpgCount}`);
  log(`GIF files: ${gifCount}`);
  log(`WEBP files: ${webpCount}`);
  log(`AVIF files: ${avifCount}`);

  return {
    imagesToCompress,
  };
}

function processSvg(svgFileName: string): OptimizedFileResult | undefined {
  if (!COMPRESS_SVG) {
    return;
  }

  const svgContent = readFileSync(svgFileName, 'utf8');
  const sizeBefore = Buffer.byteLength(svgContent, 'utf8');
  const optimizedSvg = optimize(svgContent, {
    path: svgFileName,
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  });
  const sizeAfter = Buffer.byteLength(optimizedSvg.data, 'utf8');
  const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
  const isChangeSignificant = percentageChange < -1;

  if (!isChangeSignificant) {
    return;
  }

  writeFileSync(svgFileName, optimizedSvg.data);
  return {
    fileName: svgFileName,
    fileSizeBefore: sizeBefore,
    fileSizeAfter: sizeAfter,
    percentageChange,
    isChangeSignificant,
  };
}

async function processWebp(
  webpFileName: string
): Promise<OptimizedFileResult[]> {
  const webpFileData = readFileSync(webpFileName);
  const sizeBefore = webpFileData.byteLength;
  const results: OptimizedFileResult[] = [];

  if (COMPRESS_WEBP) {
    const { data, info } = await sharp(webpFileData)
      .webp({
        nearLossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;

    if (isChangeSignificant) {
      writeFileSync(webpFileName, data);
      results.push({
        fileName: webpFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (EXPORT_AVIF) {
    const { data, info } = await sharp(webpFileData)
      .avif({
        lossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;
    const newFileName = webpFileName.replace('.webp', '.avif');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);
      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  return results;
}

async function processAvif(
  avifFileName: string
): Promise<OptimizedFileResult | undefined> {
  if (!COMPRESS_AVIF) {
    return;
  }

  const avifFileData = readFileSync(avifFileName);
  const sizeBefore = avifFileData.byteLength;

  const { data, info } = await sharp(avifFileData)
    .avif({
      lossless: true,
    })
    .toBuffer({
      resolveWithObject: true,
    });

  const sizeAfter = info.size;
  const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
  const isChangeSignificant = percentageChange < -1;

  if (!isChangeSignificant) {
    return;
  }

  writeFileSync(avifFileName, data);
  return {
    fileName: avifFileName,
    fileSizeBefore: sizeBefore,
    fileSizeAfter: sizeAfter,
    percentageChange,
    isChangeSignificant,
  };
}

async function processJpg(jpgFileName: string): Promise<OptimizedFileResult[]> {
  const jpgFileData = readFileSync(jpgFileName);
  const sizeBefore = jpgFileData.byteLength;
  const results: OptimizedFileResult[] = [];

  if (COMPRESS_JPG && !REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    const { data, info } = await sharp(jpgFileData).jpeg().toBuffer({
      resolveWithObject: true,
    });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;

    if (isChangeSignificant) {
      writeFileSync(jpgFileName, data);
      results.push({
        fileName: jpgFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (EXPORT_WEBP) {
    const { data, info } = await sharp(jpgFileData)
      .webp({
        nearLossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;
    const newFileName = jpgFileName.replace('.jpg', '.webp');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);

      if (REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
        unlinkSync(jpgFileName);
      }

      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (EXPORT_AVIF) {
    const { data, info } = await sharp(jpgFileData)
      .avif({
        lossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;
    const newFileName = jpgFileName.replace('.jpg', '.avif');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);
      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }
  return results;
}

async function processPng(pngFileName: string): Promise<OptimizedFileResult[]> {
  if (!COMPRESS_PNG) {
    return [];
  }

  const results: OptimizedFileResult[] = [];
  const pngFileData = readFileSync(pngFileName);
  const sizeBefore = pngFileData.byteLength;

  if (COMPRESS_PNG && !REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    const { data, info } = await sharp(pngFileData).png().toBuffer({
      resolveWithObject: true,
    });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;

    if (isChangeSignificant) {
      results.push({
        fileName: pngFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });

      writeFileSync(pngFileName, data);
    }
  }

  if (EXPORT_WEBP) {
    const { data, info } = await sharp(pngFileData)
      .webp({
        nearLossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = ((sizeBefore - sizeAfter) / sizeBefore) * 100;
    const isChangeSignificant = percentageChange < -1;
    const newFileName = pngFileName.replace('.png', '.webp');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);

      if (REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
        unlinkSync(pngFileName);
      }

      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (EXPORT_AVIF) {
    const { data, info } = await sharp(pngFileData)
      .avif({
        lossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = ((sizeBefore - sizeAfter) / sizeBefore) * 100;
    const isChangeSignificant = percentageChange < -1;
    const newFileName = pngFileName.replace('.png', '.avif');

    if (isChangeSignificant) {
      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });

      writeFileSync(newFileName, data);
    }
  }

  return results;
}

async function processGif(gifFileName: string): Promise<OptimizedFileResult[]> {
  const gifFileData = readFileSync(gifFileName);
  const sizeBefore = gifFileData.byteLength;
  const results: OptimizedFileResult[] = [];

  if (COMPRESS_GIF && !REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    const { data, info } = await sharp(gifFileData, { animated: true })
      .gif()
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;

    if (isChangeSignificant) {
      writeFileSync(gifFileName, data);
      results.push({
        fileName: gifFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (EXPORT_WEBP) {
    const { data, info } = await sharp(gifFileData, { animated: true })
      .webp({
        nearLossless: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    const isChangeSignificant = percentageChange < -1;
    const newFileName = gifFileName.replace('.gif', '.webp');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);
      results.push({
        fileName: newFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });

      if (REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
        unlinkSync(gifFileName);
      }
    }
  }

  return results;
}
