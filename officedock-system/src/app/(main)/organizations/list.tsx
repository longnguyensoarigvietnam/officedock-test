'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'react-query';
import { Transition } from '@headlessui/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import api from '@base/api';
import { NO_DATA_AVAILABLE } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import { PermissionsSystem } from '@constants/enums';

import {
  OrganizationFilterFormData,
  Organizations,
} from '@interfaces/organization';
import useOrganizationList from '@hooks/useOrganizationList';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { OrganizationStateContext } from '@providers/OrganizationProvider';
import { hasPermissionInArray } from '@utils';
import { useErrorToast } from '@hooks/useErrorToast';

const ListOrganizations = () => {
  const { data: session } = useSession();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { setDataOrganizationDetail } = useContext(OrganizationStateContext);

  const { showToast } = useToast();
  const [showFilter, setShowFilter] = useState(true);

  const [dataOrganizations, setDataOrganizations] = useState<Organizations[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterRequest, setFilterRequest] = useState({
    name: '',
    superiorName: '',
  });
  const [orderingRequest, _setOrderingRequest] = useState('');

  const { organizationList, refetchOrganizationList } = useOrganizationList(
    { page: currentPage },
    { name: filterRequest.name, superiorName: filterRequest.superiorName },
    orderingRequest,
  );

  // Set ID organization for delete
  const [idOrganizationChoose, setIdOrganizationChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const { register, handleSubmit } = useForm<OrganizationFilterFormData>({
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (organizationList) {
      setDataOrganizations(organizationList.results);
      setTotalPages(organizationList.numPages);
    }
  }, [organizationList]);

  const onSubmit: SubmitHandler<OrganizationFilterFormData> = (data) => {
    setFilterRequest({
      name: encodeURIComponent(`${data.name}`) || '',
      superiorName: encodeURIComponent(`${data.superiorName}`) || '',
    });
    setCurrentPage(1);
  };

  // Delete organization
  const handleOpenDeleteOrganizationModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdOrganizationChoose(id);
  };

  const handleConfirmDeleteOrganization = () => {
    if (idOrganizationChoose) {
      setIsLoading(true);
      deleteOrganization(idOrganizationChoose);
      return;
    }
  };

  const postDeleteOrganization = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.ORGANIZATION_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deleteOrganization } = useMutation(postDeleteOrganization, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (organizationList?.results.length === 1 && currentPage > 1) {
        // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
        setCurrentPage(currentPage - 1);
      } else {
        refetchOrganizationList();
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
        <div className="flex justify-between px-3 py-4 rounded-t-lg border-b bg-gray-100">
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
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-1/2">
                    <Input
                      label="組織名"
                      placeholder="入力してください"
                      register={register('name')}
                    />
                  </div>
                  <div className="w-1/2">
                    <Input
                      label="上位組織"
                      placeholder="入力してください"
                      labelClassName="[&>span]:text-gray-500"
                      register={register('superiorName')}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end ">
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
            PermissionsSystem.ORGANIZATION_ADD,
          ) && (
            <Link href={pageRouters.CREATE_ORGANIZATION.href}>
              <Button className="w-44">新規登録</Button>
            </Link>
          )}
      </div>
      <div className="w-full">
        <Table className="bg-white !rounded-lg relative">
          <TableHeader>
            <th className="w-20">
              <div className="flex w-full items-center justify-center gap-1 hover:cursor-pointer">
                <span>ID</span>
              </div>
            </th>
            <th className="w-[346px] max-w-[346px] text-left">
              <span>組織名</span>
            </th>
            <th className="w-[346px] max-w-[346px] text-left">
              <span>上位組織</span>
            </th>
            <th className="w-36 max-w-[144px]">
              <span>ユーザー数</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataOrganizations && dataOrganizations.length ? (
              dataOrganizations.map((element, index) => (
                <tr key={index}>
                  <td className="w-20">{element.id}</td>
                  <td className="w-[346px] max-w-[346px] text-left truncate">
                    {element.name}
                  </td>
                  <td className="w-[346px] max-w-[346px] text-left truncate">
                    {element?.superior?.name}
                  </td>
                  <td className="w-36 max-w-[144px] truncate">
                    {element.userCount}
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        onClick={() => {
                          setDataOrganizationDetail(element);
                        }}
                        href={pageRouters.DETAIL_ORGANIZATION.href(
                          `${element.id}`,
                        )}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_UPDATE,
                      ) ? (
                        <Link
                          onClick={() => {
                            setDataOrganizationDetail(element);
                          }}
                          href={pageRouters.EDIT_ORGANIZATION.href(
                            `${element.id}`,
                          )}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className="w-6 h-6 hover:cursor-pointer"
                          />
                        </Link>
                      ) : (
                        <div className="w-6"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                          onClick={() =>
                            handleOpenDeleteOrganizationModal(element.id)
                          }
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
        {dataOrganizations && dataOrganizations.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="組織"
        onConfirm={handleConfirmDeleteOrganization}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListOrganizations;
