'use client';
import React, { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';

import { SCREEN_LIST } from '@constants';
import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { RoleStateContext } from '@providers/RoleProvider';

import useRoleDetail from '@hooks/useRoleDetail';

const DetailRoleTable = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
      <div className="flex gap-5 items-center w-full mb-5">
        <p className="text-black font-medium text-[26px]">権限管理</p>
        <div
          className="flex gap-2 items-center hover:cursor-pointer"
          onClick={() => router.push(pageRouters.ROLES_MANAGEMENT.href)}>
          <ImageRound
            name="Back"
            src={'/icons/back-to-list.svg'}
            className="w-[15px] h-[15px] hover:cursor-pointer"
          />
          <p className="text-sm font-medium text-[#77858F]">詳細を確認する</p>
        </div>
      </div>
      <div
        className="bg-[#F8FAFC] rounded-[14px] p-5"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <p className="text-[#77858F] font-medium text-[16px] mb-5 break-all max-w-[100%]">
          {dataRoleDetail?.name}
        </p>
        <div className="flex flex-col h-[calc(100%_-_95px)] justify-between">
          <div
            className={`max-h-[calc(100vh_-_350px)] ring-1 ring-gray-200 overflow-x-auto rounded-lg bg-white`}>
            <div className=" bg-[#F8FAFC] flex w-full sticky top-0 z-10 rounded-tl-lg rounded-tr-lg ring-1 ring-gray-200 [&>div]:bg-[#F8FAFC]">
              <div className="w-1/5 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                対応機能
              </div>
              <div className="w-1/5 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                閲覧
              </div>
              <div className="w-1/5 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                追加
              </div>
              <div className="w-1/5 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                更新
              </div>
              <div className="w-1/5 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs">
                削除
              </div>
            </div>
            {dataRoleDetail?.permissions.map((permission, index) => {
              return (
                <div
                  key={index}
                  className="flex w-full bg-white relative border-b-[1px]">
                  <div className="w-1/5 flex items-center justify-start pl-4 py-3 border-r-[1px] text-[16px] font-medium">
                    {SCREEN_LIST.find(
                      (screen) => screen.value == permission.screenName,
                    )?.name || ''}
                  </div>
                  <div className="w-1/5 px-3 flex items-center justify-start py-3 border-r-[1px] text-sm font-medium">
                    {permission.actions.view || '-'}
                  </div>
                  <div className="w-1/5 px-3 flex items-center justify-start py-3 border-r-[1px] text-sm font-medium">
                    {permission.actions.add || '-'}
                  </div>
                  <div className="w-1/5 px-3 flex items-center justify-start py-3 border-r-[1px] text-sm font-medium">
                    {permission.actions.update || '-'}
                  </div>
                  <div className="w-1/5 px-3 flex items-center justify-start py-3 text-sm font-medium">
                    {permission.actions.delete || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailRoleTable;
