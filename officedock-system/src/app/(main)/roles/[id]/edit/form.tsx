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
import { useToast } from '@providers/ToastProvider';
import useRoleDetail from '@hooks/useRoleDetail';
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
      <form>
        <div className="w-96 mb-10">
          <Input
            required
            label="ロール名"
            placeholder="入力してください"
            value={roleName}
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
          <div className="grid mb-3 grid-cols-[300px_350px_350px_350px_350px] bg-[#F3F4F6]  w-full sticky top-0 z-10 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200  [&>div]:bg-[#F3F4F6] ">
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
            onClick={handleConfirmEditRole}>
            編集
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

export default EditRoleForm;
