'use client';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Transition } from '@headlessui/react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import { NO_DATA_AVAILABLE } from '@constants';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import useRoleList from '@hooks/useRoleList';
import { RoleDetail } from '@interfaces/role';
import { RoleStateContext } from '@providers/RoleProvider';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const ListRoles = () => {
  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [dataRoles, setDataRoles] = useState<RoleDetail[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [idRoleChoose, setIdRoleChoose] = useState<number>();
  const [filterRequest, setFilterRequest] = useState({
    name: '',
  });

  const { setIsLoading } = useContext(LoadingContext);
  const { setDataRoleDetail } = useContext(RoleStateContext);
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onSubmit',
  });
  const { roleList, refetchRoleList } = useRoleList(
    {
      page: currentPage,
    },
    {
      name: filterRequest.name,
    },
  );
  const showErrorToast = useErrorToast();

  useEffect(() => {
    if (roleList) {
      setDataRoles(roleList.results);
      setTotalPages(roleList.numPages);
    }
  }, [roleList]);

  const onSubmit: SubmitHandler<{ name: string }> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      name: encodeURIComponent(`${data.name}`) || '',
    });
  };

  // Delete role
  const handleOpenDeleteRoleModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdRoleChoose(id);
  };

  const handleConfirmDeleteRole = () => {
    if (idRoleChoose) {
      setIsLoading(true);
      deleteRole(idRoleChoose);
    }
  };

  const postDeleteRole = async (id: number) => {
    const { data: response } = await api.delete(apiRouters.ROLE_DETAIL(id));
    return response;
  };

  const { mutate: deleteRole } = useMutation(postDeleteRole, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (roleList?.results.length === 1 && currentPage > 1) {
        // If change current page, useRoleList auto recall, just don't need using refetchRoleList
        setCurrentPage(currentPage - 1);
      } else {
        refetchRoleList();
      }
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setOpenConfirmDeleteModal(false);
      setIsLoading(false);
    },
  });

  const showDeleteIcon = (role: boolean) => {
    return (
      !role &&
      session?.user.permissions &&
      hasPermissionInArray(
        session.user.permissions,
        PermissionsSystem.ROLE_DELETE,
      )
    );
  };

  const showUpdateIcon = (role: boolean) => {
    return (
      !role &&
      session?.user.permissions &&
      hasPermissionInArray(
        session.user.permissions,
        PermissionsSystem.ROLE_UPDATE,
      )
    );
  };

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
                      label="ロール名"
                      placeholder="入力してください"
                      register={register('name')}
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
      {session?.user.permissions &&
        hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.ROLE_ADD,
        ) && (
          <div className="flex justify-end">
            <Link href={pageRouters.CREATE_ROLE.href} className={'flex'}>
              <Button className="w-44">新規登録</Button>
            </Link>
          </div>
        )}

      <div className="w-full">
        <Table className="bg-white !rounded-lg relative">
          <TableHeader>
            <th className="w-3">
              <span>ID</span>
            </th>
            <th className="text-left w-[228px] max-w-[228px]">
              <span>ロール名</span>
            </th>
            <th className="w-20">操作</th>
          </TableHeader>
          <TableBody>
            {dataRoles && dataRoles.length ? (
              dataRoles.map((element, index) => (
                <tr key={index}>
                  <td className="w-3">{element.id}</td>
                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.systemRole && '(システムロール)'}
                    {element.name}
                  </td>
                  <td className="w-20">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        onClick={() => {
                          setDataRoleDetail(element);
                        }}
                        href={pageRouters.DETAIL_ROLE.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {showUpdateIcon(element?.systemRole || false) ? (
                        <Link
                          onClick={() => {
                            setDataRoleDetail(element);
                          }}
                          href={pageRouters.EDIT_ROLE.href(`${element.id}`)}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-6 h-6 hover:cursor-pointer`}
                          />
                        </Link>
                      ) : (
                        <div className="w-6 h-6"></div>
                      )}
                      {showDeleteIcon(element?.systemRole || false) ? (
                        <ImageRound
                          name="Delete"
                          src="/icons/delete.svg"
                          className="w-6 h-6 hover:cursor-pointer"
                          onClick={() => handleOpenDeleteRoleModal(element.id)}
                        />
                      ) : (
                        <div className="w-6 h-6"></div>
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
        <Pagination
          onChange={(pageNumber) => setCurrentPage(pageNumber)}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="ロール"
        onConfirm={handleConfirmDeleteRole}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListRoles;
