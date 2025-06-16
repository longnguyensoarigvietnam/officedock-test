'use client';

import { APP_NAME_METADATA } from '@constants';

type MetadataProps = {
  metadata: string | undefined;
  taskDurationText?: string;
};

const Metadata = ({ metadata, taskDurationText }: MetadataProps) => {
  return (
    <>
      {metadata ? (
        <title>{`${taskDurationText ? `${taskDurationText} - ` : ''}${APP_NAME_METADATA} | ${metadata ? metadata : ''}`}</title>
      ) : null}
    </>
  );
};

export default Metadata;
