'use client';
import { AxiosError } from 'axios';
import { useParams, useRouter } from 'next/navigation';

import ViewInfo from '@components/common/ViewInfo';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE, UNREGISTERED } from '@constants/message';
import { ServerStatusCode, StatusCompany } from '@constants/enums';
import useCompanyDetail from '@hooks/useDetailCompany';
import { renderDate } from '@utils';
import { useToast } from '@providers/ToastProvider';

const CompanyDetailInfo = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  // Call and handle API get company detail
  const { companyDetail } = useCompanyDetail({
    companyId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.COMPANY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <ViewInfo label="会社名">{companyDetail?.name}</ViewInfo>

      <ViewInfo label="契約状態">
        {companyDetail?.contract?.status === StatusCompany.ALREADY
          ? '締結済み'
          : '未締結'}
      </ViewInfo>
      <ViewInfo label="契約開始日">
        {companyDetail?.contract?.startDate
          ? renderDate(companyDetail?.contract?.startDate)
          : UNREGISTERED}
      </ViewInfo>
      <ViewInfo label="契約終了日">
        {companyDetail?.contract?.endDate
          ? renderDate(companyDetail?.contract?.endDate)
          : UNREGISTERED}
      </ViewInfo>
    </div>
  );
};

export default CompanyDetailInfo;
