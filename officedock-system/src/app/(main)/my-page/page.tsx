import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import MyPage from './profile';

const TagPage = () => {
  return (
    <MainLayout
      title={pageRouters.MY_PAGE.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-[41px] pt-6 !overflow-x-auto"
      showFooter={false}>
      <MyPage />
    </MainLayout>
  );
};

export default TagPage;
