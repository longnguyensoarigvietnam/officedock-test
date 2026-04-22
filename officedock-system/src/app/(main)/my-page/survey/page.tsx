import MainLayout from '@components/layouts/MainLayout';
import SurveyListPage from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SurveyPage = () => {
  return (
    <MainLayout
      title={pageRouters.SURVEY.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-[41px] pt-6 !overflow-x-auto"
      showFooter={false}>
      <SurveyListPage />
    </MainLayout>
  );
};

export default SurveyPage;
