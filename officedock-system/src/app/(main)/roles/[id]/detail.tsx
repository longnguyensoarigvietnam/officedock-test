'use client';
import React, { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';
import Button from '@components/common/Button';

import { SCREEN_LIST } from '@constants';
import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { RoleStateContext } from '@providers/RoleProvider';

import useRoleDetail from '@hooks/useRoleDetail';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

const DetailRoleTable = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { expanded } = useContext(GlobalStateContext);
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);
  const { dataRoleDetail, setDataRoleDetail } = useContext(RoleStateContext);
  const { roleDetail } = useRoleDetail({
    roleId: Number(params.id),
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ROLES_MANAGEMENT.href);
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
    if (roleDetail) {
      setDataRoleDetail(roleDetail);
    }
  }, [setDataRoleDetail, roleDetail]);
  useEffect(() => {
    if (!dataRoleDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataRoleDetail, setIsLoading]);

  return (
    <div>
      <div className="mb-10">
        <ViewInfo label="ロール名" className={`break-words ${expanded ? '!w-[calc(100%_-_200px)]' : '!w-[calc(100%_-_60px)]'}`}>{dataRoleDetail?.name} </ViewInfo>
      </div>
      <div className="flex flex-col h-[calc(100%_-_95px)] justify-between">
        <div
          className={`max-h-[calc(100vh_-_380px)] ring-1 ring-gray-200 overflow-x-auto rounded-tl-2xl rounded-tr-2xl bg-white`}>
          <div className=" bg-[#F3F4F6] flex w-full sticky top-0 z-10 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200 [&>div]:bg-[#F3F4F6]">
            <div className="w-1/5 h-12 flex items-center justify-center"></div>
            <div className="w-1/5 h-12 flex items-center justify-center text-center">
              閲覧
            </div>
            <div className="w-1/5 h-12 flex items-center justify-center text-center">
              追加
            </div>
            <div className="w-1/5 h-12 flex items-center justify-center text-center">
              更新
            </div>
            <div className="w-1/5 h-12 flex items-center justify-center text-center">
              削除
            </div>
          </div>
          {dataRoleDetail?.permissions.map((permission, index) => {
            return (
              <div
                key={index}
                className="flex w-full bg-white relative border-b-[1px]">
                <div className="w-1/5 flex items-center justify-start pl-2 border-r-[1px]">
                  {SCREEN_LIST.find(
                    (screen) => screen.value == permission.screenName,
                  )?.name || ''}
                </div>
                <div className="w-1/5 px-3 flex items-center justify-center py-2 border-r-[1px]">
                  {permission.actions.view || '-'}
                </div>
                <div className="w-1/5 px-3 flex items-center justify-center py-2 border-r-[1px]">
                  {permission.actions.add || '-'}
                </div>
                <div className="w-1/5 px-3 flex items-center justify-center py-2 border-r-[1px]">
                  {permission.actions.update || '-'}
                </div>
                <div className="w-1/5 px-3 flex items-center justify-center py-2">
                  {permission.actions.delete || '-'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="w-full flex items-center flex-col my-8">
          <Button
            className="w-[426px]"
            variant="secondary"
            type="button"
            onClick={() => router.push(pageRouters.ROLES_MANAGEMENT.href)}>
            戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetailRoleTable;
