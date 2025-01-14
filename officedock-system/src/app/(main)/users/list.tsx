'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import Link from 'next/link';
import { useMutation } from 'react-query';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import { User, UserFilterFormData } from '@interfaces/user';

import { apiRouters, pageRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE } from '@constants';
import { PermissionsSystem } from '@constants/enums';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import useCreationRoleUser from '@hooks/useCreationRoleUser';
import useUserList from '@hooks/useUserList';

import { LoadingContext } from '@providers/LoadingProvider';
import { UserStateContext } from '@providers/UserProvider';
import { useToast } from '@providers/ToastProvider';
import { hasPermissionInArray } from '@utils';
import { useErrorToast } from '@hooks/useErrorToast';

const ListUsers = () => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);
  const { setDataUserDetail } = useContext(UserStateContext);
  const showErrorToast = useErrorToast();

  const { showToast } = useToast();
  const [showFilter, setShowFilter] = useState(true);
  const [dataUsers, setDataUsers] = useState<User[]>([]);
  const [roleUserOptions, setRoleUserOptions] = useState<OptionDropdownType[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { register, control, handleSubmit } = useForm<UserFilterFormData>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    companyName: '',
    fullName: '',
    organizationName: '',
    role: '',
  });

  // TODO: Update logic sort for multi column
  const [orderingRequest, _setOrderingRequest] = useState('');

  // Set ID user for delete
  const [idUserChoose, setIdUserChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const { creationRoleUserData } = useCreationRoleUser({});
  const { userList, refetchUserList } = useUserList(
    {
      page: currentPage,
    },
    {
      fullName: filterRequest.fullName,
      companyName: filterRequest.companyName,
      organizationName: filterRequest.organizationName,
      role: filterRequest.role,
    },
    orderingRequest,
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
          value: org.name,
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

  const onSubmit: SubmitHandler<UserFilterFormData> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      fullName: encodeURIComponent(`${data.fullName}`) || '',
      companyName: encodeURIComponent(`${data.companyName}`) || '',
      organizationName: encodeURIComponent(`${data.organizationName}`) || '',
      role: data.role?.value ? encodeURIComponent(`${data.role?.value}`) : '',
    });
  };

  // Delete user
  const handleOpenDeleteUserModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdUserChoose(id);
  };

  const handleConfirmDeleteUser = () => {
    if (idUserChoose) {
      setIsLoading(true);
      deleteUser(idUserChoose);
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
      if (userList?.results.length === 1 && currentPage > 1) {
        // If change current page, useUserList auto recall, just don't need using refetchUserList
        setCurrentPage(currentPage - 1);
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

  return (
    <Fragment>
      <div className="flex flex-col border rounded-lg">
        <div
          className={`flex justify-between px-3 py-4 rounded-t-lg ${showFilter && 'border-b'} bg-gray-100`}>
          <span className="text-gray-700 text-base font-medium">検索</span>
          <ImageRound
            name="Filter extend icon"
            src={'/icons/arrow-down.svg'}
            className={`w-4 h-4 hover:cursor-pointer ${!showFilter && 'rotate-180'}`}
            onClick={() => setShowFilter(!showFilter)}
          />
        </div>
        <Transition
          show={showFilter}
          enter="transition-transform duration-300 ease-out"
          enterFrom="transform -translate-y-[10%]"
          enterTo="transform translate-y-0"
          leave="transition-transform duration-150 ease-in"
          leaveFrom="transform translate-y-0"
          leaveTo="transform -translate-y-[10%]">
          <form
            className={`flex flex-col gap-4 p-4 bg-white`}
            onSubmit={handleSubmit(onSubmit)}>
            <div className="flex gap-4">
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-1/2">
                    <Input
                      label="名前"
                      placeholder="入力してください"
                      register={register('fullName')}
                    />
                  </div>
                  <div className="w-1/2">
                    <Input
                      label="会社名"
                      placeholder="入力してください"
                      labelClassName="[&>span]:text-gray-500"
                      register={register('companyName')}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-1/2">
                    <Input
                      label="組織名"
                      placeholder="入力してください"
                      labelClassName="[&>span]:text-gray-500"
                      register={register('organizationName')}
                    />
                  </div>
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name={'role'}
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="ロール"
                          options={roleUserOptions}
                          placeholder="選択してください"
                          className="w-1/2"
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                type="submit"
                className="w-28 !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent">
                絞り込み
              </Button>
            </div>
          </form>
        </Transition>
      </div>
      <div className="flex justify-end">
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.USER_ADD,
          ) && (
            <Link href={pageRouters.CREATE_USER.href}>
              <Button className="w-44">新規登録</Button>
            </Link>
          )}
      </div>
      <div className="w-full">
        <Table className="bg-white !rounded-lg relative">
          <TableHeader>
            <th className="w-16">
              <span>ID</span>
            </th>
            <th className="text-left w-[228px] max-w-[228px]">
              <span>名前</span>
            </th>
            <th className="text-left w-[236px] max-w-[200px]">
              <span>会社名</span>
            </th>
            <th className="text-left w-[236px] max-w-[200px]">
              <span>組織名</span>
            </th>
            <th className="w-36 max-w-[144px]">
              <span>ロール</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataUsers && dataUsers.length ? (
              dataUsers.map((element, index) => (
                <tr key={index}>
                  <td className="w-16">{element.id}</td>
                  <td className="whitespace-nowrap w-[228px] max-w-[228px] truncate">
                    <div className="flex flex-col text-left">
                      <span className="truncate">
                        {element.profile.fullName}
                      </span>
                      <span className="truncate">
                        {element.email || element.username}
                      </span>
                    </div>
                  </td>
                  <td className="text-left w-[236px] max-w-[200px] truncate">
                    {element.company.name}
                  </td>
                  <td className="text-left w-[236px] max-w-[200px] truncate">
                    {element.organizations
                      .map((item) => item.name)
                      .join(' ／ ')}
                  </td>
                  <td className="w-36 max-w-[144px] truncate">
                    {element.roles.map((item) => item.name).join(' ／ ')}
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        onClick={() => {
                          setDataUserDetail(element);
                        }}
                        href={pageRouters.DETAIL_USER.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {element.actions && element.actions.update ? (
                        <Link
                          onClick={() => {
                            setDataUserDetail(element);
                          }}
                          href={pageRouters.EDIT_USER.href(`${element.id}`)}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-6 h-6 hover:cursor-pointer`}
                          />
                        </Link>
                      ) : (
                        <div className="w-6"></div>
                      )}
                      {element.actions && element.actions.delete ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className={`w-6 h-6 hover:cursor-pointer`}
                          onClick={() => handleOpenDeleteUserModal(element.id)}
                        />
                      ) : (
                        <div className="w-6"></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="py-5 text-center text-sm leading-6">
                <td className="h-16" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center">
        {dataUsers && dataUsers.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="ユーザー"
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListUsers;
