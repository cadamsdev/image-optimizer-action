import { v4 as uuidv4 } from 'uuid';

export const GITHUB_TOKEN = process.env['INPUT_GITHUB-TOKEN'] || '';
export const DEBUG = process.env['INPUT_DEBUG'] === 'true';
export const COMPRESS_SVG = process.env['INPUT_COMPRESS-SVG'] ? process.env['INPUT_COMPRESS-SVG'] === 'true' : true;
export const COMPRESS_PNG = process.env['INPUT_COMPRESS-PNG'] ? process.env['INPUT_COMPRESS-PNG'] === 'true' : true;
export const COMPRESS_JPG = process.env['INPUT_COMPRESS-JPG'] ? process.env['INPUT_COMPRESS-JPG'] === 'true' : true;
export const COMPRESS_GIF = process.env['INPUT_COMPRESS-GIF'] ? process.env['INPUT_COMPRESS-GIF'] === 'true' : true;
export const COMPRESS_WEBP = process.env['INPUT_COMPRESS-WEBP'] ? process.env['INPUT_COMPRESS-WEBP'] === 'true' : true;
export const COMPRESS_AVIF = process.env['INPUT_COMPRESS-AVIF'] ? process.env['INPUT_COMPRESS-AVIF'] === 'true' : true;
export const EXPORT_WEBP = process.env['INPUT_EXPORT-WEBP'] === 'true';
export const EXPORT_AVIF = process.env['INPUT_EXPORT-AVIF'] === 'true';
export const REPLACE_ORIGINAL_AFTER_EXPORT_WEBP = process.env['INPUT_REPLACE-ORIGINAL-AFTER-EXPORT-WEBP'] === 'true';
export const IGNORE_PATHS = process.env['INPUT_IGNORE-PATHS'] ? process.env['INPUT_IGNORE-PATHS'].split('\n').filter(path => !!path) : [];
export const PR_BODY_CHAR_LIMIT = 65536;
export const TEMP_DIR = `./temp-${uuidv4()}`;
