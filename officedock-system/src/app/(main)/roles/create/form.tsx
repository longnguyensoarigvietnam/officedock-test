'use client';
import React, { useContext, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';

import Input from '@components/common/Input';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import Button from '@components/common/Button';

import { PermissionType, ScreenAction, ScreenName } from '@constants/enums';
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
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { LoadingContext } from '@providers/LoadingProvider';

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
const CreateRoleForm = () => {
  const [roleName, setRoleName] = useState<string>('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { showToast } = useToast();
  const [rows, setRows] = useState<rowDataType[]>([]);
  const { setIsLoading } = useContext(LoadingContext);
  const [isSubmit, setIsSubmit] = useState(false);
  const showErrorToast = useErrorToast();
  const { expanded } = useContext(GlobalStateContext);

  useEffect(() => {
    const initialRows: rowDataType[] = [];
    SCREEN_LIST.map((screen) => {
      initialRows.push({
        screenLabel: screen.name,
        screenValue: screen.value,
        add:
          screen.value != ScreenName.STATISTIC
            ? PermissionType.NOT_ALLOWED
            : PermissionType.ONLY_DATA_OWN,
        delete:
          screen.value != ScreenName.STATISTIC
            ? PermissionType.NOT_ALLOWED
            : '',
        update:
          screen.value != ScreenName.STATISTIC
            ? PermissionType.NOT_ALLOWED
            : PermissionType.ONLY_DATA_OWN,
        view: PermissionType.NOT_ALLOWED,
      });
    });
    setRows(initialRows);
  }, []);

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

  const handleCreateRole = async (dataRole: RoleFormData) => {
    setIsLoading(true);
    const { data } = await api.post(apiRouters.ROLE_LIST, dataRole);
    return data;
  };

  const { mutate: createNewRole } = useMutation(
    'postCreateRole',
    handleCreateRole,
    {
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.ROLES_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmCreateRole = (e: any) => {
    e.preventDefault();
    if (isSubmit) return;
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
    setIsSubmit(true);
    createNewRole({
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
          className={`max-h-[calc(100vh_-_320px)] ${expanded ? 'w-[calc(100vw_-_300px)] max-w-[1583px]' : 'w-[calc(100vw_-_170px)] max-w-[1577px]'} ring-1 ring-gray-200 overflow-x-auto rounded-lg bg-white`}>
          <div className="grid grid-cols-[540px_500px_0px_500px_0px] bg-[#F8FAFC] w-full sticky top-0 z-10 rounded-tl-lg rounded-tr-lg ring-gray-200 [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1] [&>div]:bg-[#F8FAFC] ">
            <div className="w-[540px] sticky left-0 z-[9] h-12 flex items-center justify-start pl-4 text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              対応機能
            </div>
            <div className="w-[500px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              閲覧
            </div>
            <div className="w-[0px] h-12  pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1] hidden">
              追加
            </div>
            <div className="w-[500px] h-12 flex items-center justify-start pl-4 text-center text-[#77858F] font-medium text-xs border-r-[1px] border-[#D2DBE1]">
              編集
            </div>
            <div className="w-[0px] h-12  pl-4 text-center text-[#77858F] font-medium text-xs hidden">
              削除
            </div>
          </div>
          {rows.map((row, index) => {
            return (
              <div
                key={index}
                className="flex w-full bg-white relative [&>div]:border-b-[1px] [&>div]:border-[#D2DBE1] ">
                <div className="min-w-[540px] flex items-center sticky left-0 z-[9] bg-white justify-start px-3 border-r-[1px] border-[#D2DBE1] text-[16px] font-medium">
                  <div className="w-full">{row.screenLabel}</div>
                </div>
                <div className="min-w-[500px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1]">
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
                <div className="min-w-[350px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1] hidden">
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
                <div className="min-w-[500px] px-3 z-[8] py-2 border-r-[1px] border-[#D2DBE1]">
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
                <div className="min-w-[350px] px-3 z-[8] py-2 hidden">
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

export default CreateRoleForm;
