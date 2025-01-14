'use client';
import { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';
import Button from '@components/common/Button';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { UNREGISTERED } from '@constants';

import { useToast } from '@providers/ToastProvider';

import useOrganizationDetail from '@hooks/useOrganizationDetail';
import { OrganizationStateContext } from '@providers/OrganizationProvider';
import { LoadingContext } from '@providers/LoadingProvider';

const OrganizationDetail = () => {
  const { dataOrganizationDetail, setDataOrganizationDetail } = useContext(
    OrganizationStateContext,
  );

  const { setIsLoading } = useContext(LoadingContext);

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { organizationDetail } = useOrganizationDetail({
    organizationId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });
  useEffect(() => {
    if (organizationDetail) {
      setDataOrganizationDetail(organizationDetail);
    }
  }, [setDataOrganizationDetail, organizationDetail]);
  useEffect(() => {
    if (!dataOrganizationDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataOrganizationDetail, setIsLoading]);

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="組織名">{dataOrganizationDetail?.name}</ViewInfo>
        <ViewInfo label="上位組織">
          {dataOrganizationDetail?.superior?.name || UNREGISTERED}
        </ViewInfo>
        <ViewInfo label="ユーザー数">
          {' '}
          {dataOrganizationDetail?.userCount}
        </ViewInfo>
      </div>
      <div className="w-full flex items-center gap-4 mt-8 justify-center mb-3">
        <Button
          variant="secondary"
          type="button"
          className="w-[426px]"
          onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default OrganizationDetail;
