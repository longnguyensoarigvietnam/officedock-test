'use client';

import { useContext } from 'react';

import { APP_NAME_METADATA, DEFAULT_TIME_TEXT } from '@constants';

import useContinueCounterTime from '@hooks/useContinueCounterTime';
import useTaskDurationDetail from '@hooks/useTaskDurationDetail';

import { TaskContext } from '@providers/TaskProvider';

type MetadataProps = {
  metadata: string | undefined;
};

const Metadata = ({ metadata }: MetadataProps) => {
  const { dataRunning } = useContext(TaskContext);
  const { taskDurationDetail } = useTaskDurationDetail({
    item: {
      id: `${dataRunning.id}`.replace('event', ''),
      type: `${dataRunning.type}`,
    },
  });
  const elapsedTime = useContinueCounterTime(
    taskDurationDetail?.taskDuration
      ? taskDurationDetail
      : { taskDuration: DEFAULT_TIME_TEXT, isStart: false },
  );

  const taskDurationText = `${taskDurationDetail?.taskDuration && taskDurationDetail.isStart ? `${elapsedTime} - ${taskDurationDetail.title}` : ''}`;

  return (
    <>
      {metadata ? (
        <title>{`${taskDurationText ? `${taskDurationText} - ` : ''}${APP_NAME_METADATA} | ${metadata ? metadata : ''}`}</title>
      ) : null}
    </>
  );
};

export default Metadata;
