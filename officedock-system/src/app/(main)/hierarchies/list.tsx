'use client';
import { useMutation } from 'react-query';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Transition } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';

import { apiRouters, pageRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE } from '@constants';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import { CurrentScreen, PermissionsSystem } from '@constants/enums';

import useOrganizationList from '@hooks/useOrganizationList';
import { useErrorToast } from '@hooks/useErrorToast';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import { Organizations } from '@interfaces/organization';
import useOrganizationOptions from '@hooks/useFullOrganizationList';
import { hasPermissionInArray } from '@utils';
import { HierarchyStateContext } from '@providers/HierarchyProvider';

const ListHierarchy = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const { setDataHierarchyDetail } = useContext(HierarchyStateContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { data: session } = useSession();

  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [idOrganizationChoose, setIdOrganizationChoose] = useState<number>();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [idChoose, setIdChoose] = useState<OptionDropdownType>();

  const [dataOrganizations, setDataOrganizations] = useState<Organizations[]>(
    [],
  );

  const [dataOptionsOrganization, setDataOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);

  // TODO: Update logic sort for multi column
  const [orderingRequest, _setOrderingRequest] = useState('');

  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    name: '',
  });

  const { organizationOptions, refetchOrganizationOptions } =
    useOrganizationOptions({
      is_hierarchy: true,
      current_screen: CurrentScreen.CATEGORY_HIERARCHY,
    });

  const { organizationList, refetchOrganizationList } = useOrganizationList(
    { page: currentPage },
    { name: filterRequest.name },
    orderingRequest,
    true,
  );

  useEffect(() => {
    if (organizationOptions) {
      setDataOptionsOrganization(
        organizationOptions.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [organizationOptions]);

  useEffect(() => {
    if (organizationList) {
      setDataOrganizations(organizationList.results);
      setTotalPages(organizationList.numPages);
    }
  }, [organizationList]);

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
      apiRouters.ACTION_STATISTIC_ORGANIZATION(`${id}`),
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
      refetchOrganizationOptions();
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setOpenConfirmDeleteModal(false);
      setIsLoading(false);
    },
  });

  const onSubmit: SubmitHandler<{ name: string }> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      name: encodeURIComponent(`${data.name}`) || '',
    });
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
              <div className="w-1/2 flex gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Input
                      label="組織"
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
          PermissionsSystem.CATEGORY_HIERARCHY_ADD,
        ) && (
          <div className="flex justify-end gap-10">
            <div className="w-60">
              <Dropdown
                placeholder="選択してください"
                classNameTextData=" !px-2 [&>div]:justify-center "
                classNameOption=""
                className=""
                options={dataOptionsOrganization}
                onChange={(e) => setIdChoose(e)}
              />
            </div>
            <Link
              href={
                idChoose && idChoose.value
                  ? pageRouters.CREATE_HIERARCHY.href(`${idChoose?.value}`)
                  : ''
              }
              className={'flex'}>
              <Button disabled={!idChoose} className="w-44">
                新規登録
              </Button>
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
              <span>組織</span>
            </th>
            <th className="w-20">操作</th>
          </TableHeader>
          <TableBody>
            {dataOrganizations && dataOrganizations.length ? (
              dataOrganizations.map((element, index) => (
                <tr key={index}>
                  <td className="w-3">{element.id}</td>
                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.name}
                  </td>
                  <td className="w-20">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        onClick={() => {
                          setDataHierarchyDetail(element);
                        }}
                        href={pageRouters.DETAIL_HIERARCHY.href(
                          `${element.id}`,
                        )}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {element.actions?.update ? (
                        <Link
                          onClick={() => {
                            setDataHierarchyDetail(element);
                          }}
                          href={pageRouters.EDIT_HIERARCHY.href(
                            `${element.id}`,
                          )}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-6 h-6 hover:cursor-pointer`}
                          />
                        </Link>
                      ) : (
                        <div className="w-6"></div>
                      )}
                      {element.actions?.delete ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className={`w-6 h-6 hover:cursor-pointer`}
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
        type="集計カテゴリ階層"
        onConfirm={handleConfirmDeleteOrganization}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListHierarchy;
