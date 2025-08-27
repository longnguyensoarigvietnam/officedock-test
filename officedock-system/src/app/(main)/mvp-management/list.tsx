'use client';

import { Fragment } from 'react';

import { CurrentVotingList } from './current-voting-list';
import { FutureVotingSettings } from './future-voting-settings';
import { PastVotingResults } from './past-voting-results';

const MVPList = () => {
  return (
    <Fragment>
      <div className="flex flex-col gap-[20px]">
        <CurrentVotingList />
        <FutureVotingSettings />
        <PastVotingResults />
      </div>
    </Fragment>
  );
};

export default MVPList;
