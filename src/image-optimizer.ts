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
import { formatSize, getPercentageChange } from './utils/file-utils';

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

const EXTENSION_TO_CONFIG_MAP: {
  [key: string]: {
    flag: boolean;
    sharpFormat: keyof sharp.FormatEnum;
    readOptions?: sharp.SharpOptions;
    exportOptions?: {
      [key: string]:
        | sharp.OutputOptions
        | sharp.JpegOptions
        | sharp.PngOptions
        | sharp.WebpOptions
        | sharp.AvifOptions
        | sharp.GifOptions;
    };
    exportToWebp?: boolean;
    exportToAvif?: boolean;
  };
} = {
  gif: {
    flag: COMPRESS_GIF,
    readOptions: { animated: true },
    exportOptions: { webp: { nearLossless: true } },
    sharpFormat: 'gif',
    exportToWebp: EXPORT_WEBP,
  },
  png: {
    flag: COMPRESS_PNG,
    sharpFormat: 'png',
    exportToWebp: EXPORT_WEBP,
    exportToAvif: EXPORT_AVIF,
  },
  jpg: {
    flag: COMPRESS_JPG,
    sharpFormat: 'jpeg',
    exportToWebp: EXPORT_WEBP,
    exportToAvif: EXPORT_AVIF,
  },
  jpeg: {
    flag: COMPRESS_JPG,
    sharpFormat: 'jpeg',
    exportToWebp: EXPORT_WEBP,
    exportToAvif: EXPORT_AVIF,
  },
  webp: { flag: COMPRESS_WEBP, sharpFormat: 'webp', exportToAvif: EXPORT_AVIF },
  avif: { flag: COMPRESS_AVIF, sharpFormat: 'avif' },
};

export async function processImages({
  imagesToCompress,
}: ImageProcessorConfig): Promise<OptimizedFileResult[]> {
  const results: OptimizedFileResult[] = [];
  for (let imageFileName of imagesToCompress) {
    const extension = imageFileName.substring(
      imageFileName.lastIndexOf('.') + 1
    );

    if (extension === 'svg') {
      const svgResult = processSvg(imageFileName);
      if (svgResult) {
        results.push(svgResult);
      }
      continue;
    }

    const result = await processImage(imageFileName);
    results.push(...result);
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
  log(
    `SVG: ${svgFileName} - ${formatSize(sizeBefore)} -> ${formatSize(
      sizeAfter
    )} (${percentageChange.toFixed(2)}%)`
  );
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

export async function processImage(
  imageFileName: string
): Promise<OptimizedFileResult[]> {
  const results: OptimizedFileResult[] = [];
  const extension = imageFileName.substring(imageFileName.lastIndexOf('.') + 1);
  const fileData = readFileSync(imageFileName);
  const sizeBefore = fileData.byteLength;
  const config = EXTENSION_TO_CONFIG_MAP[extension];

  if (config.flag && !REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
    const { data, info } = await sharp(fileData, config.readOptions)
      .toFormat(config.sharpFormat, config.exportOptions?.[config.sharpFormat])
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    log(
      `${extension.toUpperCase()} (compress_${extension}): ${imageFileName} - ${formatSize(
        sizeBefore
      )} -> ${formatSize(sizeAfter)} (${percentageChange.toFixed(2)}%)`
    );
    const isChangeSignificant = percentageChange < -1;

    if (isChangeSignificant) {
      writeFileSync(imageFileName, data);
      results.push({
        fileName: imageFileName,
        fileSizeBefore: sizeBefore,
        fileSizeAfter: sizeAfter,
        percentageChange,
        isChangeSignificant,
      });
    }
  }

  if (config.exportToWebp) {
    const { data, info } = await sharp(fileData, config.readOptions)
      .toFormat('webp', config.exportOptions?.webp)
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    log(
      `${extension.toUpperCase()} (export_webp): ${imageFileName} - ${formatSize(
        sizeBefore
      )} -> ${formatSize(sizeAfter)} (${percentageChange.toFixed(2)}%)`
    );
    const isChangeSignificant = percentageChange < -1;
    const newFileName = imageFileName.replace(`.${extension}`, '.webp');

    if (isChangeSignificant) {
      writeFileSync(newFileName, data);

      if (REPLACE_ORIGINAL_AFTER_EXPORT_WEBP) {
        unlinkSync(imageFileName);
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

  if (config.exportToAvif) {
    const { data, info } = await sharp(fileData, config.readOptions)
      .toFormat('avif', config.exportOptions?.avif)
      .toBuffer({
        resolveWithObject: true,
      });

    const sizeAfter = info.size;
    const percentageChange = getPercentageChange(sizeBefore, sizeAfter);
    log(
      `${extension.toUpperCase()} (export_avif): ${imageFileName} - ${formatSize(
        sizeBefore
      )} -> ${formatSize(sizeAfter)} (${percentageChange.toFixed(2)}%)`
    );
    const isChangeSignificant = percentageChange < -1;
    const newFileName = imageFileName.replace(`.${extension}`, '.avif');

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
