'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import InputSearch from '@components/common/InputSearch';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import { apiRouters, pageRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import {
  ActionsModal,
  CreateUserType,
  PermissionsSystem,
  ServerStatusCode,
} from '@constants/enums';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_EMAIL_AVAILABLE_MESSAGE,
  ERROR_ID_AVAILABLE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import useCreationRoleUser from '@hooks/useCreationRoleUser';
import useUserList from '@hooks/useUserList';
import { useErrorToast } from '@hooks/useErrorToast';
import useCreationOrganization from '@hooks/useCreationOrganization';
import useDebounceText from '@hooks/useDebounceText';
import useUserDetail from '@hooks/useUserDetail';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import {
  CreateUserFormData,
  CreateUserFormRequest,
  User,
  UserRoleType,
} from '@interfaces/user';
import ActionsUserModal from '@components/modals/ActionsUserModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResponseError } from '@interfaces/response';

const ListUsers = () => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);

  const showErrorToast = useErrorToast();

  const { showToast } = useToast();
  const router = useRouter();
  const { authenticatedUser } = useAuthenticatedUser();

  // State
  const [dataUsers, setDataUsers] = useState<User[]>([]);
  const [roleUserOptions, setRoleUserOptions] = useState<OptionDropdownType[]>(
    [],
  );
  const [openActionsUserModal, setOpenActionsUserModal] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');

  const [organizationUserOptions, setOrganizationUserOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [userEditId, setUserEditId] = useState<number | null>(null);
  const [userEditDetail, setUserEditDetail] = useState<User | null>(null);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>('');
  const [usernameErrorMessage, setUsernameErrorMessage] = useState<string>('');

  // Set ID user for delete
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(
    null,
  );
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const [userIdParam, setUserIdParam] = useState<string | null>(
    searchParams.get('userId'),
  );
  const [actionTypeParam, setActionTypeParam] = useState<string | null>(
    searchParams.get('action'),
  );

  const { creationRoleUserData } = useCreationRoleUser({});
  const debouncedSearch = useDebounceText(search, 1000);

  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    companyName: '',
    organizationId: '',
    role: '',
    page: 1,
  });

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);

  useCreationOrganization({
    onSuccess: (data) => {
      setOrganizationUserOptions([
        {
          label: '選択',
          value: '',
        },
        ...data.map((item) => ({
          label: item.name,
          value: Number(item.id),
        })),
      ]);
    },
  });

  const { userList, refetchUserList } = useUserList(
    {
      page: debouncedParams.page,
      pageSize,
    },
    {
      fullName: debouncedParams.search,
      companyName: debouncedParams.companyName,
      organizationId: debouncedParams.organizationId,
      role: debouncedParams.role,
    },
  );

  useEffect(() => {
    if (creationRoleUserData) {
      setRoleUserOptions([
        {
          label: '選択',
          value: '',
        },
        ...creationRoleUserData.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      ]);
    }
  }, [creationRoleUserData]);

  useEffect(() => {
    if (userList) {
      setDataUsers(userList.results);
      setTotalPages(userList.numPages);
    }
  }, [userList]);

  // Delete user
  const handleOpenDeleteUserModal = (user: User) => {
    setOpenConfirmDeleteModal(true);
    setSelectedUserToDelete(user);
  };

  const handleConfirmDeleteUser = () => {
    if (selectedUserToDelete) {
      setIsLoading(true);
      deleteUser(selectedUserToDelete.id);
      return;
    }
  };

  const postDeleteUser = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.USER_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deleteUser } = useMutation(postDeleteUser, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (userList?.results.length === 1 && debouncedParams.page > 1) {
        // If change current page, useUserList auto recall, just don't need using refetchUserList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchUserList();
      }
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setOpenConfirmDeleteModal(false);
      setIsLoading(false);
    },
  });

  useUserDetail({
    userId: Number(userEditId),
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSuccess: (data) => {
      setUserEditDetail(data);
      setOpenActionsUserModal(true);
    },
  });

  const handleSetParam = ({
    id,
    action,
  }: {
    id?: string | null;
    action?: string | null;
  }) => {
    if (id) {
      params.set('userId', id);
      setUserIdParam(id);
    }
    if (action) {
      params.set('action', action);
      setActionTypeParam(action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('userId');
    params.delete('action');
    setUserIdParam(null);
    setActionTypeParam(null);
    router.replace(`?${params.toString()}`);
  };

  function areArraysEqual(
    arrayA: UserRoleType[],
    arrayB: UserRoleType[],
  ): boolean {
    if (arrayA.length !== arrayB.length) {
      return false;
    }

    for (let i = 0; i < arrayA.length; i++) {
      const itemA = arrayA[i];
      const itemB = arrayB[i];
      if (
        itemA.id !== itemB.id ||
        itemA.name !== itemB.name ||
        itemA.systemRole !== itemB.systemRole
      ) {
        return false;
      }
    }

    return true;
  }

  // Handle submit edit user
  const handleEditUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.USER_DETAIL(String(userEditId)), data);
  };

  const { mutate: editUser } = useMutation('postEditUser', handleEditUser, {
    onSuccess: async ({ data }) => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });

      if (
        userEditDetail?.roles &&
        !areArraysEqual(data.roles, userEditDetail?.roles) &&
        String(userEditId) === `${session?.user.id}`
      ) {
        await signOut({
          redirect: false,
        });
        router.push(pageRouters.LOGIN.href);
      } else {
        refetchUserList();
        setUserEditDetail(null);
        setOpenActionsUserModal(false);
        setUserEditId(null);
        handleRemoveParam();
        setUsernameErrorMessage('');
        setEmailErrorMessage('');
      }
    },
    onError: ({
      response,
    }: ResponseError<{ username: string; email: string }>) => {
      if (response?.data.username) {
        setUsernameErrorMessage(ERROR_ID_AVAILABLE_MESSAGE);
      }
      if (response?.data.email) {
        setEmailErrorMessage(ERROR_EMAIL_AVAILABLE_MESSAGE);
      }
      if (response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      } else {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleConfirmEditUser = (
    data: CreateUserFormData,
    isOptionEmail: boolean,
  ) => {
    const organizationIds = data.organizations
      .filter((item) => item.value !== '')
      .map((item) => ({ organizationId: item.value, isMain: false }));
    if (data.mainOrganization?.value) {
      organizationIds.push({
        organizationId: data.mainOrganization.value,
        isMain: true,
      });
    }
    const roleListId = data.roles
      .filter((item) => item.value !== '')
      .map((item) => item.value as number);

    if (isOptionEmail) {
      editUser({
        email: data.email,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.EMAIL,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: data.password !== '' ? data.password : null,
      });
    } else {
      editUser({
        username: data.username,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.USERNAME,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: data.password !== '' ? data.password : null,
      });
    }
  };

  //Function call api create user
  const handleCreateUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.USER_LIST, data);
  };

  const { mutate: createUser } = useMutation(
    'postCreateUser',
    handleCreateUser,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        refetchUserList();
        setUserEditDetail(null);
        setOpenActionsUserModal(false);
        setUserEditId(null);
        handleRemoveParam();
        setUsernameErrorMessage('');
        setEmailErrorMessage('');
      },
      onError: ({
        response,
      }: ResponseError<{ username: string; email: string }>) => {
        if (response?.data.username) {
          setUsernameErrorMessage(ERROR_ID_AVAILABLE_MESSAGE);
        }
        if (response?.data.email) {
          setEmailErrorMessage(ERROR_EMAIL_AVAILABLE_MESSAGE);
        }
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_COMMON_MESSAGE,
          });
        } else {
          showToast({
            variant: 'error',
            description: ERROR_CREATE_MESSAGE,
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmCreateUser = (
    data: CreateUserFormData,
    isOptionEmail: boolean,
  ) => {
    const organizationIds = data.organizations
      .filter((item) => item.value !== '')
      .map((item) => ({ organizationId: item.value, isMain: false }));
    if (data.mainOrganization?.value) {
      organizationIds.push({
        organizationId: data.mainOrganization.value,
        isMain: true,
      });
    }
    const roleListId = data.roles
      .filter((item) => item.value !== '')
      .map((item) => item.value as number);

    if (isOptionEmail) {
      createUser({
        email: data.email,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.EMAIL,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: null,
      });
    } else {
      createUser({
        username: data.username,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.USERNAME,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: null,
      });
    }
  };

  useEffect(() => {
    if (
      userIdParam &&
      !userEditDetail &&
      actionTypeParam === ActionsModal.EDIT
    ) {
      setUserEditId(Number(userIdParam));
    }

    if (actionTypeParam === ActionsModal.CREATE && !openActionsUserModal) {
      setOpenActionsUserModal(true);
    }
  }, [userIdParam, actionTypeParam, userEditDetail, openActionsUserModal]);

  const isPermissionAdd =
    session?.user.permissions &&
    hasPermissionInArray(session?.user.permissions, PermissionsSystem.USER_ADD);
  const isPermissionUpdate =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.USER_UPDATE,
    );

  return (
    <Fragment>
      <div>
        <div className="font-medium text-sm text-[#77858F] flex items-center justify-between">
          <div className=" flex items-center  gap-5">
            <p className="text-black text-[26px]">ユーザー管理</p>
            <span>{authenticatedUser?.company.name || ''}</span>
            <span>全メンバー30人 / 50</span>
          </div>
          <div className="flex gap-[10px] items-center">
            <p>現在のプラン</p>
            <div className="w-24 h-[34px] cursor-pointer  bg-white rounded-md text-black text-xs flex items-center justify-center ">
              スタンダード
            </div>
          </div>
        </div>
        <div className="mt-[30px] flex justify-between">
          <div className=" flex gap-3 items-center">
            <div className="h-[34px] w-fit ">
              <InputSearch
                className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
                inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
                iconClassName="w-[14px] h-[14px]"
                placeholder="名前を検索"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
            </div>
            <div className="flex gap-[10px] items-center">
              <ImageRound
                src="/icons/filter.svg"
                name="Filter icon"
                className="w-[14px] h-[14px] ml-2"
              />

              {/* Search team */}
              <div className="w-[220px]">
                <Dropdown
                  options={organizationUserOptions}
                  placeholder="チーム"
                  placeholderClass="!text-black text-sm font-normal"
                  className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                  labelTextClass="!text-[#77858F] !text-xs !font-medium"
                  classNameOption="!text-sm"
                  onChange={(data) => {
                    setDebouncedParams((prev) => ({
                      ...prev,
                      page: 1,
                      organizationId: data.value as string,
                    }));
                  }}
                />
              </div>
            </div>
            {/* Search role */}
            <div className="w-[220px]">
              <Dropdown
                options={roleUserOptions}
                placeholder="権限"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                selectedOption={undefined}
                onChange={(data) => {
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: 1,
                    role: data.value as string,
                  }));
                }}
              />
            </div>
          </div>
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.USER_ADD,
            ) && (
              <Button
                className="w-[120px]"
                onClick={() => {
                  setOpenActionsUserModal(true);
                  handleSetParam({
                    action: ActionsModal.CREATE,
                  });
                }}>
                <ImageRound
                  src="/icons/add-with-background.svg"
                  name="Add icon"
                  className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
                />
                新規追加
              </Button>
            )}
        </div>
      </div>

      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="w-full relative p-[30px] mt-[30px] bg-[#F8FAFC] rounded-[14px]">
        <Table
          classCustom="!px-0 !py-0"
          className="bg-white text-xs font-medium !text-[#77858F] !rounded-lg relative !py-0 !px-0">
          <TableHeader classCustom=" [&>th]:text-xs [&>th]:border-r [&>th]:border-b [&>th]:border-[#D2DBE1] [&>th:last-child]:border-r-0">
            <th className="w-[220px] !text-[#77858F] text-left">
              <span>名前</span>
            </th>
            <th className="w-[88px] !text-[#77858F] text-left">
              <span>ID</span>
            </th>
            <th className="text-left !text-[#77858F] w-[228px] max-w-[228px]">
              <span>メインチーム</span>
            </th>
            <th className="text-left !text-[#77858F] w-[328px] max-w-[328px]">
              <span>サブチーム</span>
            </th>
            <th className="text-left !text-[#77858F] w-[232px] max-w-[232px]">
              <span>権限</span>
            </th>
          </TableHeader>
          <TableBody className=" [&>tr>td]:pr-[14px] [&>tr>td]:pl-[18px] [&>tr>td]:border-r [&>tr>td]:border-gray-300 [&>tr>td:last-child]:border-r-0">
            {dataUsers && dataUsers.length ? (
              dataUsers.map((element, index) => (
                <tr key={index} className="text-sm text-black font-medium">
                  <td className="w-[220px]">
                    <div className=" flex items-start gap-2">
                      <div className="flex items-start flex-grow gap-[6px]">
                        <div className="w-[30px] h-[30px]">
                          <AvatarIconWithDynamicColor
                            color={element.avatarColor}
                            size={30}
                            customClassName="relative top-[3px]"
                          />
                        </div>
                        <p className="text-[16px] text-black break-all text-left w-0 min-w-0 flex-grow relative top-[5px]">
                          {element.profile.fullName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-10 pt-2">
                        {element.actions && element.actions.update && (
                          <>
                            <div
                              onClick={() => {
                                setUserEditId(element.id);
                                handleSetParam({
                                  id: String(element.id),
                                  action: ActionsModal.EDIT,
                                });
                              }}>
                              <ImageRound
                                name="Edit"
                                src={`/icons/${element.id == userEditId ? 'edit-gray' : 'edit'}.svg`}
                                className={`w-[14px] h-[14px] hover:cursor-pointer`}
                              />
                            </div>
                          </>
                        )}
                        {element.actions && element.actions.update && (
                          <ImageRound
                            name="Delete"
                            onClick={() => handleOpenDeleteUserModal(element)}
                            src={'/icons/delete.svg'}
                            className={`w-[13px] h-[15px] hover:cursor-pointer`}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="w-[88px] break-all text-left align-top !pt-4">
                    {element.id}
                  </td>
                  <td className="text-left w-[228px] max-w-[228px] break-all align-top !pt-4">
                    {element.organizations
                      .filter((data) => data.isMain)
                      .map((item) => item.name)
                      .join(' ／ ')}
                  </td>
                  <td className="text-left w-[328px] max-w-[328px] break-all align-top !pt-4">
                    {element.organizations
                      .filter((data) => !data.isMain)
                      .map((item) => item.name)
                      .join(' ／ ')}
                  </td>
                  <td className="w-[232px] max-w-[232px] text-left break-all align-top !pt-4">
                    {element.roles.map((item) => item.name).join(' ／ ')}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="py-5 text-center text-sm leading-6">
                <td className="h-16 !border-r-0" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataUsers && dataUsers.length ? (
              <Pagination
                onChange={(pageNumber) => {
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }));
                }}
                currentPage={debouncedParams.page}
                totalPages={totalPages}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[66px]">
              <Dropdown
                options={PAGE_SIZE_OPTIONS}
                selectedOption={PAGE_SIZE_OPTIONS.find(
                  (element) => element.value == pageSize,
                )}
                className="h-[34px] !w-full !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                classNameTextData="!text-xs"
                classActive="!text-sm"
                classNameOption="!text-sm !border-[#77858F] !ring-[#77858F] !ring-opacity-100 !bottom-full !mb-1"
                labelOptionClass="!text-sm font-medium !pl-1.5"
                onChange={(e) => {
                  setPageSize(Number(e.value));
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: 1,
                  }));
                }}
              />
            </div>
            <p className="text-sm">人ずつ表示</p>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="ユーザー"
        message="紐づいている要素からも削除されます。"
        name={selectedUserToDelete?.profile.fullName}
        userColor={selectedUserToDelete?.avatarColor}
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
      {openActionsUserModal &&
        actionTypeParam &&
        (isPermissionAdd || isPermissionUpdate) && (
          <ActionsUserModal
            open={openActionsUserModal}
            action={actionTypeParam}
            dataUserDetail={userEditDetail}
            originalOrganizationOptions={organizationUserOptions.filter(
              (role) => role.value,
            )}
            roleUserOptions={roleUserOptions.filter((role) => role.value)}
            emailErrorMessage={emailErrorMessage}
            usernameErrorMessage={usernameErrorMessage}
            onClose={() => {
              handleRemoveParam();
              setOpenActionsUserModal(false);
              setUserEditId(null);
              setUserEditDetail(null);
            }}
            onDelete={(userToDelete: User) => {
              handleOpenDeleteUserModal(userToDelete);
              setUserEditDetail(null);
              setOpenActionsUserModal(false);
              setUserEditId(null);
              handleRemoveParam();
            }}
            onCreate={(data: CreateUserFormData, isOptionEmail: boolean) => {
              if (isPermissionAdd) {
                handleConfirmCreateUser(data, isOptionEmail);
              }
            }}
            onEdit={(data: CreateUserFormData, isOptionEmail: boolean) => {
              if (isPermissionUpdate) {
                handleConfirmEditUser(data, isOptionEmail);
              }
            }}
          />
        )}
    </Fragment>
  );
};

export default ListUsers;
