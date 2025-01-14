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

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { OptionDropdownType } from '@interfaces/common';
import { OrganizationSkill } from '@interfaces/skills';

import useOrganizationOptions from '@hooks/useFullOrganizationList';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import { hasPermissionInArray } from '@utils';

import api from '@base/api';
import { OrganizationSkillStateContext } from '@providers/OrganizationSkillProvider';
import { useErrorToast } from '@hooks/useErrorToast';

const ListOrganizationSkills = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { setDataOrganizationSkillDetail } = useContext(
    OrganizationSkillStateContext,
  );

  const { showToast } = useToast();

  const { data: session } = useSession();

  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [idOrganizationSkillChoose, setIdOrganizationSkillChoose] =
    useState<number>();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [idChoose, setIdChoose] = useState<OptionDropdownType>();

  const [dataOrganizationSkills, setDataOrganizationSkills] = useState<
    OrganizationSkill[]
  >([]);

  const [dataOptionsOrganization, setDataOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);

  // TODO: Update logic sort for multi column
  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    name: '',
  });

  const { organizationOptions, refetchOrganizationOptions } =
    useOrganizationOptions({
      is_with_skill: true,
      current_screen: CurrentScreen.ORGANIZATION_SKILL,
    });

  const { organizationSkillList, refetchOrganizationSkillList } =
    useOrganizationSkillList(
      { page: currentPage },
      {
        name: filterRequest.name,
      },
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
    if (organizationSkillList) {
      setDataOrganizationSkills(organizationSkillList.results);
      setTotalPages(organizationSkillList.numPages);
    }
  }, [organizationSkillList]);

  // Delete organization skill
  const handleOpenDeleteOrganizationSkillModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdOrganizationSkillChoose(id);
  };

  const handleConfirmDeleteOrganizationSkill = () => {
    if (idOrganizationSkillChoose) {
      setIsLoading(true);
      deleteOrganizationSkill(idOrganizationSkillChoose);
      return;
    }
  };
  const handleDeleteOranizationSkill = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.ORGANIZATION_SKILL_DELETE(`${id}`),
    );
    return response;
  };

  const { mutate: deleteOrganizationSkill } = useMutation(
    handleDeleteOranizationSkill,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        if (organizationSkillList?.results.length === 1 && currentPage > 1) {
          // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
          setCurrentPage(currentPage - 1);
        } else {
          refetchOrganizationSkillList();
        }
        refetchOrganizationOptions();
        setOpenConfirmDeleteModal(false);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
        setOpenConfirmDeleteModal(false);
        setIsLoading(false);
      },
    },
  );

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
          PermissionsSystem.ORGANIZATION_SKILL_ADD,
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
                  ? pageRouters.CREATE_ORGANIZATION_SKILL.href(
                      `${idChoose?.value}`,
                    )
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
            <th className="text-left w-[228px] max-w-[228px]">
              <span>スキル</span>
            </th>
            <th className="w-20">操作</th>
          </TableHeader>
          <TableBody>
            {dataOrganizationSkills && dataOrganizationSkills.length ? (
              dataOrganizationSkills.map((element, index) => (
                <tr key={index}>
                  <td className="w-3">{element.id}</td>
                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.organization.name}
                  </td>
                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.skill}
                  </td>
                  <td className="w-20">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        href={pageRouters.DETAIL_ORGANIZATION_SKILL.href(
                          `${element.organization.id}`,
                        )}
                        onClick={() => {
                          setDataOrganizationSkillDetail(element.allSkills);
                        }}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {element.actions?.update ? (
                        <Link
                          href={pageRouters.EDIT_ORGANIZATION_SKILL.href(
                            `${element.organization.id}`,
                          )}
                          onClick={() => {
                            setDataOrganizationSkillDetail(element.allSkills);
                          }}>
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
                            handleOpenDeleteOrganizationSkillModal(element.id)
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
        {dataOrganizationSkills && dataOrganizationSkills.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="組織_スキル"
        onConfirm={handleConfirmDeleteOrganizationSkill}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListOrganizationSkills;
