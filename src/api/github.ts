import { context, getOctokit } from '@actions/github';
import { GITHUB_TOKEN, IGNORE_PATHS } from '../constants';
import { log } from '../utils/logger-utils';
import { sync } from 'glob';

export const githubApi = getOctokit(GITHUB_TOKEN);

export function getEventData() {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.payload.pull_request?.number || 0;
  const isWorkflowDispatch = context.eventName === 'workflow_dispatch';
  return {
    owner,
    repo,
    issue_number: prNumber,
    isWorkflowDispatch,
  };
}

export async function getPRComments() {
  const eventData = getEventData();
  const { data } = await githubApi.rest.issues.listComments({
    owner: eventData.owner,
    repo: eventData.repo,
    issue_number: eventData.issue_number,
  });

  return data;
}

export async function getPRFileNames() {
  const eventData = getEventData();
  const { data: files } = await githubApi.rest.pulls.listFiles({
    owner: eventData.owner,
    repo: eventData.repo,
    pull_number: eventData.issue_number,
    per_page: 3000, // 3000 is the max limit
  });

  const fileNames = files.map(({ filename }) => filename);
  const filteredFileNames = sync(fileNames, { ignore: IGNORE_PATHS });
  return filteredFileNames;
}

export async function updatePRComment(commentId: number, markdown: string) {
  log('Updating comment');
  const eventData = getEventData();
  await githubApi.rest.issues.updateComment({
    owner: eventData.owner,
    repo: eventData.repo,
    comment_id: commentId,
    body: markdown,
  });
}

export async function createPRComment(markdown: string) {
  log('Creating new comment');
  const eventData = getEventData();
  await githubApi.rest.issues.createComment({
    owner: eventData.owner,
    repo: eventData.repo,
    issue_number: eventData.issue_number,
    body: markdown,
  });
}

export async function getJobUrl(): Promise<string> {
  const eventData = getEventData();
  const jobId = await getJobId();
  return `https://github.com/${eventData.owner}/${eventData.repo}/actions/runs/${context.runId}/job/${jobId}`;
}

async function getJobId() {
  const { data } = await githubApi.rest.actions.listJobsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
  });
  return data.jobs[0].id;
}
