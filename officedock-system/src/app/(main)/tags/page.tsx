import MainLayout from '@components/layouts/MainLayout';
import ListTags from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const TagPage = () => {
  return (
    <MainLayout
      title={pageRouters.TAGS_MANAGEMENT.name}
      permission={PermissionsSystem.TAG_VIEW}>
      <div className="flex flex-col gap-6">
        <ListTags />
      </div>
    </MainLayout>
  );
};

export default TagPage;
