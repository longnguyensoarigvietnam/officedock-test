'use client';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
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
import InputSearch from '@components/common/InputSearch';
import useDebounceText from '@hooks/useDebounceText';
import Dropdown from '@components/common/Dropdown';

const ListRoles = () => {
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [dataRoles, setDataRoles] = useState<RoleDetail[]>([]);

  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedRoleToDelete, setSelectedRoleToDelete] =
    useState<RoleDetail | null>(null);

  const [searchRoleName, setSearchRoleName] = useState('');
  const debouncedFilterByRoleName = useDebounceText(searchRoleName, 1000);

  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    page: 1,
  });

  const { setIsLoading } = useContext(LoadingContext);
  const { setDataRoleDetail } = useContext(RoleStateContext);
  const { data: session } = useSession();
  const { showToast } = useToast();

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedFilterByRoleName,
      page: 1,
    }));
  }, [debouncedFilterByRoleName]);

  const { roleList, refetchRoleList } = useRoleList(
    {
      page: debouncedParams.page,
      pageSize,
    },
    {
      name: debouncedParams.search,
    },
  );
  const showErrorToast = useErrorToast();

  useEffect(() => {
    if (roleList) {
      setDataRoles(roleList.results);
      setTotalPages(roleList.numPages);
    }
  }, [roleList]);

  // Delete role
  const handleOpenDeleteRoleModal = (role: RoleDetail) => {
    setOpenConfirmDeleteModal(true);
    setSelectedRoleToDelete(role);
  };

  const handleConfirmDeleteRole = () => {
    if (selectedRoleToDelete) {
      setIsLoading(true);
      deleteRole(selectedRoleToDelete.id);
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
      if (roleList?.results.length === 1 && debouncedParams.page > 1) {
        // If change current page, useRoleList auto recall, just don't need using refetchRoleList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
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
      <div className="flex justify-between">
        <InputSearch
          placeholder="権限を検索"
          inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none placeholder-[#77858F99]"
          iconClassName="w-[14px] h-[14px]"
          onChange={(e) => {
            setSearchRoleName(e.target.value);
          }}
        />
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.ROLE_ADD,
          ) && (
            <div className="flex justify-end">
              <Link href={pageRouters.CREATE_ROLE.href} className={'flex'}>
                <Button className="w-[100px] !p-0">
                  <ImageRound
                    src="/icons/add-with-background.svg"
                    name="Add icon"
                    className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
                  />
                  新規追加
                </Button>
              </Link>
            </div>
          )}
      </div>

      <div
        className="w-full p-5 bg-[#F8FAFC] rounded-[14px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <Table className="bg-white !rounded-lg relative table-fixed">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="text-left w-[calc(100%_-_220px)] max-w-[calc(100%_-_220px)]">
              <span className="text-[#77858F] text-[12px] font-medium">
                権限名
              </span>
            </th>
            <th className="w-[220px]"></th>
          </TableHeader>
          <TableBody>
            {dataRoles && dataRoles.length ? (
              dataRoles.map((element, index) => (
                <tr key={index} className="text-black">
                  <td className="text-left w-[calc(100%_-_220px)] break-words max-w-[calc(100%_-_220px)]">
                    <p className="break-all max-w-[100%] text-[16px] font-medium text-[#000000]">
                      {element.name}
                    </p>
                  </td>
                  <td className="w-[220px]">
                    <div className="flex w-full gap-4 justify-end pr-3 items-center">
                      {showUpdateIcon(element?.systemRole || false) ? (
                        <Link
                          onClick={() => {
                            setDataRoleDetail(element);
                          }}
                          href={pageRouters.EDIT_ROLE.href(`${element.id}`)}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit-gray.svg'}
                            className={`w-3.5 h-3.5 hover:cursor-pointer opacity-45`}
                          />
                        </Link>
                      ) : (
                        <div className="w-3.5 h-3.5"></div>
                      )}
                      {showDeleteIcon(element?.systemRole || false) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-gray.svg'}
                          className="w-[13px] h-[15px] hover:cursor-pointer"
                          onClick={() => handleOpenDeleteRoleModal(element)}
                        />
                      ) : (
                        <div className="w-[13px]"></div>
                      )}
                      <Link
                        href={pageRouters.DETAIL_ROLE.href(`${element.id}`)}>
                        <div className="flex gap-1 items-center">
                          <p className="text-sm font-medium text-[#77858F]">
                            詳細を確認する
                          </p>
                          <ImageRound
                            name="Detail"
                            src={'/icons/detail-gray.svg'}
                            className="w-[13px] h-[15px] hover:cursor-pointer"
                          />
                        </div>
                      </Link>
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
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataRoles && dataRoles.length ? (
              <Pagination
                onChange={(pageNumber) =>
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }))
                }
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
            <p className="text-sm">件ずつ表示</p>
          </div>
        </div>
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        name={selectedRoleToDelete?.name || ''}
        type="権限"
        message="この権限を持っているユーザーは一般権限になります。"
        onConfirm={handleConfirmDeleteRole}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListRoles;
