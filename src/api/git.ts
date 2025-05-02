import { log } from '../utils/logger-utils';
import { exec } from '@actions/exec';

export async function setupGitConfig() {
  await exec('git config --global user.name github-actions[bot]');
  await exec(
    'git config --global user.email 41898282+github-actions[bot]@users.noreply.github.com',
  );
  await exec('git config --global --add safe.directory /github/workspace');
}

export async function checkoutBranch(branchName: string) {
  await exec(`git fetch origin ${branchName}`);
  await exec(`git checkout ${branchName}`);
}

export async function commitAndPush(branchName: string) {
  await exec('git add .');

  log('Committing changes');
  await exec('sh', ['-c', 'git commit -m "Optimized images"']);

  log('Pushing changes to the branch');
  await exec(`git push origin HEAD:${branchName}`);
}
