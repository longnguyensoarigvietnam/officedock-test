'use client';
import { useMutation } from 'react-query';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
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

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { SkillMapStateContext } from '@providers/SkillMapProvider';

import useOrganizationOptions from '@hooks/useFullOrganizationList';
import useSkillMapList from '@hooks/useSkillMapList';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';

import { OptionDropdownType } from '@interfaces/common';
import { SkillMap } from '@interfaces/skills';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const ListSkillsMap = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { data: session } = useSession();
  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [skillMapChosen, setSkillMapChosen] = useState<{
    organizationId: number | null;
    staffId: number | null;
  }>();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [dataSkillMapList, setDataSkillMapList] = useState<SkillMap[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    number | undefined
  >();
  const [dataOptionsStaff, setDataOptionsStaff] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | undefined>();
  const { setDataSkillMapDetail } = useContext(SkillMapStateContext);
  const { dashboardMemberList } = useDashboardMemberList();

  // TODO: Update logic sort for multi column
  const { register, control, handleSubmit } = useForm<{
    organizationName: string;
    staff: OptionDropdownType;
  }>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    organizationName: '',
    staff: '',
  });
  const { organizationOptions, refetchOrganizationOptions } =
    useOrganizationOptions({
      is_with_staff: true,
      current_screen: CurrentScreen.SKILL_MAP,
    });
  const { skillMapList, refetchSkillMapList } = useSkillMapList(
    { page: currentPage },
    {
      organizationName: filterRequest.organizationName,
      staffId: filterRequest.staff,
    },
  );
  const [initialMemberListOptions, setInitialMemberListOptions] =
    useState<OptionDropdownType[]>();
  const [initialOrganizationListOptions, setInitialOrganizationListOptions] =
    useState<OptionDropdownType[]>();
  useEffect(() => {
    if (skillMapList) {
      setDataSkillMapList(skillMapList.results);
      setTotalPages(skillMapList.numPages);
    }
  }, [skillMapList]);
  useEffect(() => {
    if (organizationOptions) {
      const organizations = organizationOptions.map((organization) => {
        return {
          label: organization.name,
          value: Number(organization.id),
        };
      });
      setInitialOrganizationListOptions(organizations);
    }
  }, [organizationOptions]);
  useEffect(() => {
    if (dashboardMemberList?.length) {
      const memberList = dashboardMemberList.map((member) => {
        return {
          label: member.fullName,
          value: member.id,
        };
      });
      setDataOptionsStaff(memberList);
    }
  }, [dashboardMemberList]);

  // Delete skills map
  const handleOpenDeleteSkillsMapModal = (
    organizationId: number,
    staffId: number,
  ) => {
    setOpenConfirmDeleteModal(true);
    setSkillMapChosen({ organizationId, staffId });
  };
  const handleConfirmDeleteSkillsMap = () => {
    if (
      skillMapChosen &&
      (skillMapChosen.organizationId || skillMapChosen.staffId)
    ) {
      setIsLoading(true);
      deleteSkillsMap({
        organizationId: skillMapChosen.organizationId || null,
        staffId: skillMapChosen.staffId || null,
      });
      return;
    }
  };
  const postDeleteSkillsMap = async (skillMapChosen: {
    organizationId: number | null;
    staffId: number | null;
  }) => {
    const { data: response } = await api.delete(
      `${apiRouters.SKILL_MAPS_DESTROY}${skillMapChosen.organizationId ? `?organization_id=${skillMapChosen.organizationId}` : ''}${skillMapChosen.organizationId ? '&' : '?'}${skillMapChosen.staffId ? `staff_id=${skillMapChosen.staffId}` : ''}`,
    );
    return response;
  };

  const { mutate: deleteSkillsMap } = useMutation(postDeleteSkillsMap, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (skillMapList?.results.length === 1 && currentPage > 1) {
        // If change current page, useCategoryList auto recall, just don't need using refetchCategoryList
        setCurrentPage(currentPage - 1);
      } else {
        refetchSkillMapList();
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

  const onSubmit: SubmitHandler<{
    organizationName: string;
    staff: OptionDropdownType;
  }> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      staff: data.staff ? encodeURIComponent(`${data.staff.value}`) : '',
      organizationName: encodeURIComponent(`${data.organizationName}`) || '',
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
                <div className="w-1/2 flex items-end gap-4">
                  <div className="w-full">
                    <Input
                      label="組織"
                      placeholder="入力してください"
                      register={register('organizationName')}
                    />
                  </div>
                </div>
                <div className="w-1/2 flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'staff'}
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="従業員"
                          options={[
                            { label: '選択', value: '' },
                            ...dataOptionsStaff,
                          ]}
                          placeholder="選択してください"
                          className=""
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
      {session?.user.permissions &&
        hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.SKILL_MAP_ADD,
        ) && (
          <div className="flex justify-end gap-10">
            <div className="w-48">
              <Dropdown
                labelClass="truncate max-w-[130px]"
                options={initialOrganizationListOptions as OptionDropdownType[]}
                placeholder="組織"
                className="h-10 flex items-center"
                onChange={(e) => {
                  if (organizationOptions) {
                    const selectedOrganization = organizationOptions?.find(
                      (option) => option.id == e.value,
                    );
                    const memberList = selectedOrganization
                      ? selectedOrganization.users
                      : [];
                    const memberOptions = memberList
                      ? memberList.map((member) => {
                          return {
                            label: member.fullName,
                            value: member.id,
                          };
                        })
                      : [];
                    setInitialMemberListOptions(memberOptions);
                    setSelectedOrganizationId(Number(e.value));
                    setSelectedStaffId(undefined);
                  }
                }}
              />
            </div>
            <div className="w-56">
              <Dropdown
                labelClass="truncate max-w-[160px]"
                className="h-10 flex items-center"
                options={initialMemberListOptions as OptionDropdownType[]}
                selectedOption={
                  initialMemberListOptions &&
                  initialMemberListOptions.find(
                    (element) => element.value === selectedStaffId,
                  )
                }
                placeholder="従業員"
                onChange={(e) => {
                  setSelectedStaffId(Number(e.value));
                }}
              />
            </div>
            <Link
              href={pageRouters.CREATE_SKILL_MAPS.href(
                `${selectedOrganizationId}`,
                `${selectedStaffId}`,
              )}>
              <Button
                disabled={!selectedOrganizationId || !selectedStaffId}
                className="w-44">
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
            <th className="text-left w-[228px] max-w-[228px]">
              <span>従業員</span>
            </th>
            <th className="w-20">操作</th>
          </TableHeader>
          <TableBody>
            {dataSkillMapList && dataSkillMapList.length ? (
              dataSkillMapList.map((element, index) => (
                <tr key={index}>
                  <td className="w-3">{element.id}</td>

                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.organization.name}
                  </td>
                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.staff?.fullName}
                  </td>

                  <td className="w-20">
                    <div className="flex w-full gap-2 justify-center items-center">
                      <Link
                        href={pageRouters.DETAIL_SKILL_MAPS.href(
                          `${element.id}`,
                          `${element.organization.id}`,
                          `${element.staff.id}`,
                        )}
                        onClick={() => {
                          setDataSkillMapDetail(element);
                        }}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-5 h-5 hover:cursor-pointer"
                        />
                      </Link>

                      {element.actions?.update ? (
                        <Link
                          href={pageRouters.EDIT_SKILL_MAPS.href(
                            `${element.id}`,
                            `${element.organization.id}`,
                            `${element.staff.id}`,
                          )}
                          onClick={() => {
                            setDataSkillMapDetail(element);
                          }}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className="w-3.5 h-3.5 hover:cursor-pointer"
                          />
                        </Link>
                      ) : (
                        <div className="w-3.5 h-3.5"></div>
                      )}
                      {element.actions?.delete ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className={`w-[13px] h-[15px] hover:cursor-pointer`}
                          onClick={() =>
                            handleOpenDeleteSkillsMapModal(
                              element.organization.id,
                              element.staff.id,
                            )
                          }
                        />
                      ) : (
                        <div className="w-[13px]"></div>
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
        {dataSkillMapList && dataSkillMapList.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="スキルマップ"
        onConfirm={handleConfirmDeleteSkillsMap}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListSkillsMap;
