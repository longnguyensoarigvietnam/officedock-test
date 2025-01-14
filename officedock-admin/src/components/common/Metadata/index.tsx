'use client';

import { APP_NAME_METADATA } from '@constants';

type MetadataProps = {
  metadata: string | undefined;
};

const Metadata = ({ metadata }: MetadataProps) => {
  return (
    <>
      {metadata ? (
        <title>{`${APP_NAME_METADATA} | ${metadata ? metadata : ''}`}</title>
      ) : null}
    </>
  );
};

export default Metadata;
