import { IGNORE_PATHS } from '../constants';
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

export function getPercentageChange(before: number, after: number): number {
  return ((after - before) / before) * 100;
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
