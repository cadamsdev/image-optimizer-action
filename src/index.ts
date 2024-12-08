import { setFailed } from '@actions/core';
import { GITHUB_TOKEN } from './constants';
import { getEventData } from './api/github';

export async function main(): Promise<void> {
  try {
    if (!GITHUB_TOKEN) {
      setFailed('GitHub token is required');
      return;
    }

    const eventData = getEventData();
    if (eventData.isWorkflowDispatch) {
      import('./events/workflow-dispatch').then(({ run }) => run());
      return;
    }

    import('./events/pull-request').then(({ run }) => run());
  } catch (error: any) {
    setFailed(error.message);
  }
}

main();
