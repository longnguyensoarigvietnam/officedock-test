import MainLayout from '@components/layouts/MainLayout';
import SurveyListPage from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const TagPage = () => {
  return (
    <MainLayout
      title={pageRouters.SURVEY.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-8 pt-8 !overflow-x-auto"
      showFooter={false}>
      <SurveyListPage />
    </MainLayout>
  );
};

export default TagPage;
