'use client';
import React, { useContext, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useParams, useRouter } from 'next/navigation';

import Input from '@components/common/Input';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import Button from '@components/common/Button';

import {
  PermissionType,
  ScreenAction,
  ScreenName,
  ServerStatusCode,
} from '@constants/enums';
import { PERMISSION_OPTIONS, SCREEN_LIST } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  ROLE_NAME_REQUIRED_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';

import { getPermissionOptionDropdown } from '@utils';

import { RoleDetail, RoleFormData } from '@interfaces/role';

import { LoadingContext } from '@providers/LoadingProvider';
import { RoleStateContext } from '@providers/RoleProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useToast } from '@providers/ToastProvider';

import useRoleDetail from '@hooks/useRoleDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';

interface rowDataType {
  screenValue: string;
  screenLabel: string;
  view: PermissionType | string;
  add: PermissionType | string;
  update: PermissionType | string;
  delete: PermissionType | string;
}
const EditRoleForm = () => {
  const [roleName, setRoleName] = useState<string>('');
  const router = useRouter();
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<rowDataType[]>([]);
  const [error, setError] = useState('');
  const { dataRoleDetail, setDataRoleDetail } = useContext(RoleStateContext);
  const showErrorToast = useErrorToast();
  const { expanded } = useContext(GlobalStateContext);

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
    onSuccess: (data: RoleDetail) => {
      if (data.systemRole) {
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

  useEffect(() => {
    if (dataRoleDetail) {
      const initialRows: rowDataType[] = [];
      dataRoleDetail.permissions.map((permission) => {
        initialRows.push({
          screenLabel:
            SCREEN_LIST.find((screen) => screen.value == permission.screenName)
              ?.name || '',
          screenValue: permission.screenName,
          add: `${permission.actions.add}`,
          update: `${permission.actions.update}`,
          view: `${permission.actions.view}`,
          delete: `${permission.actions.delete}`,
        });
      });
      setRows(initialRows);
      setRoleName(dataRoleDetail.name);
    }
  }, [dataRoleDetail]);

  const handleEditFieldInline = (
    screenName: string,
    action: ScreenAction,
    value: any,
  ) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex(
        (row) => row.screenLabel == screenName,
      );

      if (rowIndex !== -1) {
        newRows[rowIndex][action] = value;
      }

      return newRows;
    });
  };

  const handleEditRole = async (dataRole: RoleFormData) => {
    setIsLoading(true);
    const { data } = await api.patch(
      apiRouters.ROLE_DETAIL(Number(params.id)),
      dataRole,
    );
    return data;
  };

  const { mutate: editRole } = useMutation('postEditRole', handleEditRole, {
    onSuccess: async () => {
      showToast({
        variant: 'success',
        description: SUCCESS_SAVE_MESSAGE,
      });
      router.push(pageRouters.ROLES_MANAGEMENT.href);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleConfirmEditRole = (e: any) => {
    e.preventDefault();
    if (roleName?.trim() == '') {
      setError(ROLE_NAME_REQUIRED_MESSAGE);
      return;
    }
    setError('');
    const permissions = SCREEN_LIST.reduce(
      (acc, screen) => {
        const matchingRow = rows.find(
          (row) => row.screenValue === screen.value,
        );
        acc[screen.value] = {
          view: matchingRow?.view || '',
          add: matchingRow?.add || '',
          update: matchingRow?.update || '',
          delete: matchingRow?.delete || '',
        };
        return acc;
      },
      {} as Record<
        string,
        { view: string; add: string; update: string; delete: string }
      >,
    );

    editRole({
      name: roleName,
      permissions,
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center w-full mb-5">
        <p className="text-black font-medium text-[26px]">権限管理</p>
        <div className="flex justify-end gap-3 items-center">
          <Button
            variant="outline"
            className="w-[100px] !p-0 !h-[34px]"
            onClick={() => router.push(pageRouters.ROLES_MANAGEMENT.href)}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[100px] !p-0 !h-[34px]"
            onClick={handleConfirmEditRole}>
            保存
          </Button>
        </div>
      </div>
      <form
        className="bg-[#F8FAFC] rounded-[14px] p-5"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="mb-5">
          <div className="flex gap-2 items-center">
            <p className="text-[#77858F] font-medium text-xs w-[40px]">
              権限名
            </p>
            <Input
              required
              label=""
              placeholder="入力してください"
              className="!w-[220px] rounded-[6px] text-sm !h-[34px] !border-[1px] !border-[#77858F]"
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value);
                if (e.target.value != '') {
                  setError('');
                }
              }}
              error={error ? true : false}
            />
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div
          className={`max-h-[calc(100vh_-_320px)] ${expanded ? 'w-[calc(100vw_-_300px)] max-w-[1603px]' : 'w-[calc(100vw_-_162px)] max-w-[1677px]'} ring-1 ring-gray-200 overflow-x-auto rounded-lg bg-white`}>
          <div className="grid grid-cols-[300px_350px_350px_350px_350px] bg-[#F8FAFC]  w-full sticky top-0 z-10 rounded-tl-lg rounded-tr-lg [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1] [&>div]:bg-[#F8FAFC] ">
            <div className="w-[300px] sticky left-0 z-[9] h-12 flex items-center justify-start pl-3 text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              対応機能
            </div>
            <div className="w-[350px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              閲覧
            </div>
            <div className="w-[350px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              追加
            </div>
            <div className="w-[350px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              更新
            </div>
            <div className="w-[350px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs">
              削除
            </div>
          </div>
          {rows.map((row, index) => {
            return (
              <div
                key={index}
                className="flex w-full bg-white relative [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1]">
                <div className="min-w-[300px] flex items-center sticky left-0 z-[9] bg-white justify-start px-3 border-r-[1px] border-[#D2DBE1] text-[16px] font-medium ">
                  <div className="w-full">{row.screenLabel}</div>
                </div>
                <div className="min-w-[350px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1]">
                  <TableDropdown
                    className="w-full !h-10"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    labelOptionClass="ml-0"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.VIEW,
                      PERMISSION_OPTIONS,
                    )}
                    minDropdownHeight={140}
                    disabled={
                      getPermissionOptionDropdown(
                        row.screenValue as ScreenName,
                        ScreenAction.VIEW,
                        PERMISSION_OPTIONS,
                      ).length == 0
                    }
                    selectedOption={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.VIEW,
                      PERMISSION_OPTIONS,
                    ).find((option) => option.label == row.view)}
                    onChange={(selectedOption: any) => {
                      const value = selectedOption.value;
                      handleEditFieldInline(
                        row.screenLabel,
                        ScreenAction.VIEW,
                        value,
                      );
                    }}
                  />
                </div>
                <div className="min-w-[350px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1]">
                  <TableDropdown
                    className="w-full !h-10"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.ADD,
                      PERMISSION_OPTIONS,
                    )}
                    minDropdownHeight={140}
                    disabled={
                      getPermissionOptionDropdown(
                        row.screenValue as ScreenName,
                        ScreenAction.ADD,
                        PERMISSION_OPTIONS,
                      ).length == 0
                    }
                    selectedOption={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.ADD,
                      PERMISSION_OPTIONS,
                    ).find((option) => option.label == row.add)}
                    labelOptionClass="ml-0"
                    onChange={(selectedOption: any) => {
                      const value = selectedOption.value;
                      handleEditFieldInline(
                        row.screenLabel,
                        ScreenAction.ADD,
                        value,
                      );
                    }}
                  />
                </div>
                <div className="min-w-[350px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1]">
                  <TableDropdown
                    className="w-full !h-10"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.UPDATE,
                      PERMISSION_OPTIONS,
                    )}
                    minDropdownHeight={140}
                    disabled={
                      getPermissionOptionDropdown(
                        row.screenValue as ScreenName,
                        ScreenAction.UPDATE,
                        PERMISSION_OPTIONS,
                      ).length == 0
                    }
                    selectedOption={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.UPDATE,
                      PERMISSION_OPTIONS,
                    ).find((option) => option.label == row.update)}
                    labelOptionClass="ml-0"
                    onChange={(selectedOption: any) => {
                      const value = selectedOption.value;
                      handleEditFieldInline(
                        row.screenLabel,
                        ScreenAction.UPDATE,
                        value,
                      );
                    }}
                  />
                </div>
                <div className="min-w-[350px] px-3 z-[8] py-2">
                  <TableDropdown
                    className="w-full !h-10"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.DELETE,
                      PERMISSION_OPTIONS,
                    )}
                    minDropdownHeight={140}
                    disabled={
                      getPermissionOptionDropdown(
                        row.screenValue as ScreenName,
                        ScreenAction.DELETE,
                        PERMISSION_OPTIONS,
                      ).length == 0
                    }
                    selectedOption={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.DELETE,
                      PERMISSION_OPTIONS,
                    ).find((option) => option.label == row.delete)}
                    labelOptionClass="ml-0"
                    onChange={(selectedOption: any) => {
                      const value = selectedOption.value;
                      handleEditFieldInline(
                        row.screenLabel,
                        ScreenAction.DELETE,
                        value,
                      );
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </form>
    </div>
  );
};

export default EditRoleForm;
