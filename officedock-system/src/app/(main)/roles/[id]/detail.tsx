'use client';
import React, { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import Link from 'next/link';

import Button from '@components/common/Button';

import { SCREEN_LIST } from '@constants';
import { PermissionsSystem, ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { RoleStateContext } from '@providers/RoleProvider';

import useRoleDetail from '@hooks/useRoleDetail';

import { hasPermissionInArray } from '@utils';

const DetailRoleTable = () => {
  const params = useParams<{ id: string }>();
  const { data: session } = useSessionCache();
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
      <div className="flex items-center justify-between w-full mb-[30px]">
        <div className="flex items-center gap-5 w-full">
          <p className="text-black font-medium text-[26px] leading-[1]">権限管理</p>
        </div>
        {!dataRoleDetail?.deletedAt && !dataRoleDetail?.systemRole &&
          session?.user.permissions &&
          hasPermissionInArray(
            session.user.permissions,
            PermissionsSystem.ROLE_UPDATE,
          ) && (
            <Link href={pageRouters.EDIT_ROLE.href(`${params.id}`)}>
              <Button variant="primary" className="w-[100px] !p-0 !h-[34px]">
                編集
              </Button>
            </Link>
          )}
      </div>
      <div
        className="bg-[#F8FAFC] rounded-[30px] p-5"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <p className="text-[#77858F] font-medium text-[16px] mb-5 break-all max-w-[100%]">
          {dataRoleDetail?.name}
        </p>
        <div className="flex flex-col h-[calc(100%_-_95px)] justify-between">
          <div
            className={`max-h-[calc(100vh_-_350px)] ring-1 ring-gray-200 overflow-x-auto rounded-lg bg-white`}>
            <div className=" bg-[#F8FAFC] flex w-full sticky top-0 z-10 rounded-tl-lg rounded-tr-lg ring-1 ring-gray-200 [&>div]:bg-[#F8FAFC]">
              <div className="w-1/2 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                対応機能
              </div>
              <div className="w-1/2 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] border-r-[1px] font-medium text-xs">
                権限
              </div>
            </div>
            {dataRoleDetail?.permissions
              ?.filter((permission) =>
                SCREEN_LIST.find(
                  (screen) =>
                    screen.value == permission.screenName && screen.show,
                ),
              )
              .map((permission, index) => {
                return (
                  <div
                    key={index}
                    className="flex w-full bg-white relative border-b-[1px]">
                    <div className="w-1/2 flex items-center justify-start pl-4 py-3 border-r-[1px] text-[16px] font-medium">
                      {SCREEN_LIST.find(
                        (screen) => screen.value == permission.screenName,
                      )?.name || ''}
                    </div>
                    <div className="w-1/2 px-3 flex items-center justify-start py-3 border-r-[1px] text-sm font-medium">
                      {permission.actions || '-'}
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
