'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useParams, useRouter } from 'next/navigation';

import Input from '@components/common/Input';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import Button from '@components/common/Button';

import { PermissionType, ScreenName, ServerStatusCode } from '@constants/enums';
import { PERMISSION_OPTIONS, SCREEN_LIST } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_LONG_FIELD_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  ROLE_NAME_REQUIRED_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';

import { getErrorMessageByField, getPermissionOptionDropdown } from '@utils';

import { RoleDetail, RoleFormData } from '@interfaces/role';

import { LoadingContext } from '@providers/LoadingProvider';
import { RoleStateContext } from '@providers/RoleProvider';
import { useToast } from '@providers/ToastProvider';

import useRoleDetail from '@hooks/useRoleDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';

interface rowDataType {
  screenValue: string;
  screenLabel: string;
  actions: PermissionType | string;
}
const EditRoleForm = () => {
  // Role input and error
  const [roleName, setRoleName] = useState<string>('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<rowDataType[]>([]);

  // Ref
  const isEditingRef = useRef(false);

  // Router
  const router = useRouter();

  // Toasts
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  // Loading
  const { setIsLoading } = useContext(LoadingContext);

  // Params
  const params = useParams<{ id: string }>();

  // Detail
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
    if (!isEditingRef.current) {
      setIsLoading(!dataRoleDetail);
    }
  }, [dataRoleDetail, setIsLoading]);

  useEffect(() => {
    if (dataRoleDetail) {
      const initialRows: rowDataType[] = [];
      dataRoleDetail?.permissions
        ?.filter((permission) =>
          SCREEN_LIST.find(
            (screen) => screen.value == permission.screenName && screen.show,
          ),
        )
        .map((permission) => {
          initialRows.push({
            screenLabel:
              SCREEN_LIST.find(
                (screen) => screen.value == permission.screenName,
              )?.name || '',
            screenValue: permission.screenName,
            actions: `${permission.actions}`,
          });
        });
      setRows(initialRows);
      setRoleName(dataRoleDetail.name);
    }
  }, [dataRoleDetail]);

  const handleEditFieldInline = (screenName: string, value: any) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex(
        (row) => row.screenLabel == screenName,
      );

      if (rowIndex !== -1) {
        newRows[rowIndex].actions = value;
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

  const { mutateAsync: editRole } = useMutation(
    'postEditRole',
    handleEditRole,
    {
      onMutate: () => {
        isEditingRef.current = true;
      },
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.ROLES_MANAGEMENT.href);
        isEditingRef.current = false;
      },
      onError: (error: AxiosError<any>) => {
        if (getErrorMessageByField(error, 'name')) {
          setError(getErrorMessageByField(error, 'name'));
        }
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
        isEditingRef.current = false;
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmEditRole = async (e: any) => {
    e.preventDefault();
    if (isEditingRef.current) return;
    if (roleName?.trim() == '') {
      setError(ROLE_NAME_REQUIRED_MESSAGE);
      return;
    }
    if (roleName?.trim().length > 255) {
      setError(ERROR_LONG_FIELD_MESSAGE);
      return;
    }
    setError('');
    const permissions = SCREEN_LIST.reduce(
      (acc, screen) => {
        const matchingRow = rows.find(
          (row) => row.screenValue === screen.value,
        );
        acc[screen.value] = {
          actions: matchingRow?.actions || PermissionType.EDITABLE,
        };
        return acc;
      },
      {} as Record<string, { actions: string }>,
    );
    if (permissions['category']) {
      permissions['categoryHierarchy'] = { ...permissions['category'] };
    }
    if (permissions['organization']) {
      permissions['organizationHierarchy'] = { ...permissions['organization'] };
    }
    await editRole({
      name: roleName,
      permissions,
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center w-full mb-[30px]">
        <p className="text-black font-medium text-[26px] leading-[1]">
          権限管理
        </p>
        <div className="flex justify-end gap-[10px] items-center">
          <Button
            variant="outline"
            className="w-[100px] !p-0 !h-[34px]"
            onClick={() => router.push(pageRouters.ROLES_MANAGEMENT.href)}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[100px] !p-0 !h-[34px] border-none"
            style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
            onClick={handleConfirmEditRole}>
            保存
          </Button>
        </div>
      </div>
      <form
        className="bg-[#F8FAFC] rounded-[30px] p-[30px]"
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
              className={`!w-[220px] !rounded-[6px] text-sm !h-[34px] !border-[1px] ${error ? '!border-error' : '!border-[#77858F]'} `}
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
          className={`max-h-[calc(100vh_-_320px)] ring-1 ring-gray-200 overflow-x-auto rounded-[10px] bg-white`}>
          <div className="flex bg-[#F8FAFC] w-full sticky top-0 z-10 rounded-tl-[10px] rounded-tr-[10px] [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1] [&>div]:bg-[#F8FAFC] ">
            <div className="w-1/2 h-12 flex items-center justify-start pl-[18px] text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              対応機能
            </div>
            <div className="w-1/2 h-12 flex items-center justify-start pl-[14px] text-center text-[#77858F] font-medium text-xs border-[#D2DBE1]">
              権限
            </div>
          </div>
          {rows.map((row, index) => {
            const permissionList = getPermissionOptionDropdown(
              row.screenValue as ScreenName,
              PERMISSION_OPTIONS,
            );
            return (
              <div
                key={index}
                className={`flex w-full bg-white relative ${index != rows.length - 1 && '[&>div]:border-b-[1px]'} [&>div]:border-[#D2DBE1]`}>
                <div className="w-1/2 flex items-center sticky left-0 z-[9] bg-white justify-start px-[18px] border-r-[1px] border-[#D2DBE1] text-[16px] font-medium ">
                  <div className="w-full">{row.screenLabel}</div>
                </div>
                <div className="w-1/2 px-[10px] z-[8] py-2 border-[#D2DBE1]">
                  <TableDropdown
                    className="w-full !h-10 cursor-pointer"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    labelOptionClass="ml-0"
                    options={permissionList}
                    minDropdownHeight={200}
                    disabled={permissionList.length == 0}
                    selectedOption={permissionList.find(
                      (option) => option.label == row.actions,
                    )}
                    onChange={(selectedOption: any) => {
                      const value = selectedOption.value;
                      handleEditFieldInline(row.screenLabel, value);
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
