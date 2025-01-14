'use client';
import { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';

import { DATE_FORMAT, UNREGISTERED } from '@constants';
import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import useUserDetail from '@hooks/useUserDetail';

import { useToast } from '@providers/ToastProvider';
import { UserStateContext } from '@providers/UserProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import Button from '@components/common/Button';

const UserDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const { dataUserDetail, setDataUserDetail } = useContext(UserStateContext);

  const { userDetail } = useUserDetail({
    userId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.USERS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });
  useEffect(() => {
    if (userDetail) {
      setDataUserDetail(userDetail);
    }
  }, [setDataUserDetail, userDetail]);
  useEffect(() => {
    if (!dataUserDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataUserDetail, setIsLoading]);

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="名前">{dataUserDetail?.profile.fullName} </ViewInfo>
        <ViewInfo label={`${dataUserDetail?.email ? 'メールアドレス' : 'ID'}`}>
          {dataUserDetail?.email || dataUserDetail?.username}
        </ViewInfo>
        <ViewInfo label="認証ためのメールアドレス">
          {dataUserDetail?.twoFactorAuthEmail || UNREGISTERED}
        </ViewInfo>
        <ViewInfo label="ロール">
          {' '}
          {dataUserDetail?.roles.map((item) => item.name).join(' ／ ')}{' '}
        </ViewInfo>
        <ViewInfo label="会社名">{dataUserDetail?.company.name} </ViewInfo>
        <ViewInfo label="契約開始日">
          {dataUserDetail?.company.contract.startDate
            ? format(
                parseISO(dataUserDetail.company.contract.startDate),
                DATE_FORMAT,
              )
            : UNREGISTERED}
        </ViewInfo>
        <ViewInfo label="契約終了日">
          {dataUserDetail?.company.contract.endDate
            ? format(
                parseISO(dataUserDetail.company.contract.endDate),
                DATE_FORMAT,
              )
            : UNREGISTERED}
        </ViewInfo>
        <ViewInfo label="契約のステータス">
          {dataUserDetail?.company.contract.status}{' '}
        </ViewInfo>
        <ViewInfo label="組織 正">
          {dataUserDetail?.organizations
            .filter((organization) => organization.isMain)
            .map((element) => element.name)
            .join(' ／ ') || UNREGISTERED}
        </ViewInfo>
        <ViewInfo label="組織 副">
          {dataUserDetail?.organizations
            .filter((organization) => !organization.isMain)
            .map((element) => element.name)
            .join(' ／ ') || UNREGISTERED}
        </ViewInfo>
      </div>
      <div className="w-full flex items-center gap-2 justify-center mb-3">
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

export default UserDetail;
