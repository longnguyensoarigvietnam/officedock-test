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
import { LoadingContext } from '@providers/LoadingProvider';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

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
      <form>
        <div className="w-96 mb-10">
          <Input
            required
            label="ロール名"
            placeholder="入力してください"
            onChange={(e) => {
              setRoleName(e.target.value);
              if (e.target.value != '') {
                setError('');
              }
            }}
            error={error ? true : false}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div
          className={`max-h-[calc(100vh_-_450px)] w-[calc(100vw_-_260px)] max-w-[1603px] ring-1 ring-gray-200 overflow-x-auto pb-4 rounded-tl-2xl rounded-tr-2xl bg-white`}>
          <div className="grid mb-3 grid-cols-[300px_350px_350px_350px_350px] bg-[#F3F4F6] w-full sticky top-0 z-10 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200  [&>div]:bg-[#F3F4F6] ">
            <div className="w-[300px] sticky left-0 z-[9] h-12 flex items-center justify-center"></div>
            <div className="w-[350px] h-12 flex items-center justify-center text-center">
              閲覧
            </div>
            <div className="w-[350px] h-12 flex items-center justify-center text-center">
              追加
            </div>
            <div className="w-[350px] h-12 flex items-center justify-center text-center">
              更新
            </div>
            <div className="w-[380px] h-12 flex items-center justify-center text-center">
              削除
            </div>
          </div>
          {rows.map((row, index) => {
            return (
              <div key={index} className="flex w-full bg-white relative">
                <div className="flex items-center sticky left-0 z-[9] bg-white justify-start px-3 ">
                  <div className="min-w-[280px]">{row.screenLabel}</div>
                </div>
                <div className="min-w-[350px] px-3 z-[8] my-2">
                  <TableDropdown
                    className="rounded-sm w-full !h-12"
                    labelOptionClass="ml-0"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.VIEW,
                      PERMISSION_OPTIONS,
                    )}
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
                <div className="min-w-[350px] px-3 my-2">
                  <TableDropdown
                    className="rounded-sm w-full !h-12"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.ADD,
                      PERMISSION_OPTIONS,
                    )}
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
                <div className="min-w-[350px] px-3 my-2">
                  <TableDropdown
                    className="rounded-sm w-full !h-12"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.UPDATE,
                      PERMISSION_OPTIONS,
                    )}
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
                <div className="min-w-[350px] px-3 my-2">
                  <TableDropdown
                    className="rounded-sm w-full !h-12"
                    options={getPermissionOptionDropdown(
                      row.screenValue as ScreenName,
                      ScreenAction.DELETE,
                      PERMISSION_OPTIONS,
                    )}
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
        <div className="w-full flex items-center gap-2 mt-8 flex-col">
          <Button
            className="w-[426px]"
            type="submit"
            onClick={handleConfirmCreateRole}>
            作成
          </Button>
          <Button
            className="w-[426px]"
            variant="secondary"
            type="button"
            onClick={() => router.push(pageRouters.ROLES_MANAGEMENT.href)}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateRoleForm;
