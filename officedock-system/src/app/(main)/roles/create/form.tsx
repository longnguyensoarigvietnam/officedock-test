'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';

import Input from '@components/common/Input';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import Button from '@components/common/Button';

import { PermissionType, ScreenName } from '@constants/enums';
import { PERMISSION_OPTIONS, SCREEN_LIST } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ROLE_NAME_REQUIRED_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';

import { getPermissionOptionDropdown } from '@utils';

import { RoleFormData } from '@interfaces/role';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';

interface rowDataType {
  screenValue: string;
  screenLabel: string;
  actions: PermissionType | string;
}
const CreateRoleForm = () => {
  // Role input and error
  const [roleName, setRoleName] = useState<string>('');
  const [rows, setRows] = useState<rowDataType[]>([]);
  const [error, setError] = useState('');

  // Router
  const router = useRouter();

  // Toasts
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  // Loading
  const { setIsLoading } = useContext(LoadingContext);

  // Ref
  const isCreatingRef = useRef(false);

  const getDefaultScreenAction = (screenName: string) => {
    if (screenName == ScreenName.TEAM_DOCK) return PermissionType.TEAM_AND_SUB;
    return PermissionType.NOT_ALLOWED;
  };

  useEffect(() => {
    const initialRows: rowDataType[] = [];
    SCREEN_LIST.filter((screen) => screen.show).map((screen) => {
      initialRows.push({
        screenLabel: screen.name,
        screenValue: screen.value,
        actions: getDefaultScreenAction(screen.value),
      });
    });
    setRows(initialRows);
  }, []);

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

  const handleCreateRole = async (dataRole: RoleFormData) => {
    setIsLoading(true);
    const { data } = await api.post(apiRouters.ROLE_LIST, dataRole);
    return data;
  };

  const { mutateAsync: createNewRole } = useMutation(
    'postCreateRole',
    handleCreateRole,
    {
      onMutate: () => {
        isCreatingRef.current = true;
      },
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.ROLES_MANAGEMENT.href);
        isCreatingRef.current = false;
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        isCreatingRef.current = false;
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmCreateRole = async (e: any) => {
    e.preventDefault();
    if (isCreatingRef.current) return;
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
    await createNewRole({
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
            onClick={handleConfirmCreateRole}>
            保存
          </Button>
        </div>
      </div>
      <form
        className="bg-[#F8FAFC] rounded-[30px] p-5"
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
          <div className="flex bg-[#F8FAFC] w-full sticky top-0 z-10 rounded-tl-[10px] rounded-tr-[10px] ring-gray-200 [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1] [&>div]:bg-[#F8FAFC] ">
            <div className="w-1/2 h-12 flex items-center justify-start pl-4 text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              対応機能
            </div>
            <div className="w-1/2 h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs">
              権限
            </div>
          </div>
          {rows.map((row, index) => {
            return (
              <div
                key={index}
                className={`flex w-full bg-white relative ${index != rows.length - 1 && '[&>div]:border-b-[1px]'} [&>div]:border-[#D2DBE1]`}>
                <div className="w-1/2 flex items-center sticky left-0 z-[9] bg-white justify-start px-3 border-r-[1px] border-[#D2DBE1] text-[16px] font-medium">
                  <div className="w-full">{row.screenLabel}</div>
                </div>
                <div className="w-1/2 px-3 z-[8] py-2">
                  <TableDropdown
                    className="w-full !h-10"
                    valueClassName="rounded-[6px] !border-[#77858F]"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      PERMISSION_OPTIONS,
                    )}
                    minDropdownHeight={200}
                    disabled={
                      getPermissionOptionDropdown(
                        row.screenValue as ScreenName,
                        PERMISSION_OPTIONS,
                      ).length == 0
                    }
                    selectedOption={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      PERMISSION_OPTIONS,
                    ).find((option) => option.label == row.actions)}
                    labelOptionClass="ml-0"
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

export default CreateRoleForm;
