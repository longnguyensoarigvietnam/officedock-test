import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';
import ListDeleteTags from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const TagPage = () => {
  return (
    <MainLayout
      title={pageRouters.TAGS_MANAGEMENT_HIDDEN.name}
      permission={PermissionsSystem.TAG_VIEW}
      className="px-10 pt-[30px] pb-10 !bg-[#F3F3F3] !overflow-x-auto"
      showFooter={false}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListDeleteTags />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default TagPage;
