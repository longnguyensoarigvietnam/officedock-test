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

import { apiRouters, pageRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE } from '@constants';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { SkillStateContext } from '@providers/SkillProvider';
import useSkillList from '@hooks/useSkillList';
import { Skill } from '@interfaces/skills';
import api from '@base/api';
import { hasPermissionInArray } from '@utils';
import { PermissionsSystem } from '@constants/enums';
import { useErrorToast } from '@hooks/useErrorToast';

const ListSkills = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const { setDataSkillDetail } = useContext(SkillStateContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { data: session } = useSession();

  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [idSkillChoose, setIdSkillChoose] = useState<number>();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [dataSkills, setDataSkills] = useState<Skill[]>([]);

  // TODO: Update logic sort for multi column
  const [orderingRequest, _setOrderingRequest] = useState('');

  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    name: '',
  });

  const { skillList, refetchSkillList } = useSkillList({
    pagination: {
      page: currentPage,
    },
    filter: {
      name: filterRequest.name,
    },
    ordering: orderingRequest,
  });

  useEffect(() => {
    if (skillList) {
      setDataSkills(skillList.results);
      setTotalPages(skillList.numPages);
    }
  }, [skillList]);

  // Delete skill
  const handleOpenDeleteSkillModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdSkillChoose(id);
  };
  const handleConfirmDeleteSkill = () => {
    if (idSkillChoose) {
      setIsLoading(true);
      deleteSkill(idSkillChoose);
      return;
    }
  };
  const postDeleteSkill = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.SKILL_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deleteSkill } = useMutation(postDeleteSkill, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (skillList?.results.length === 1 && currentPage > 1) {
        // If change current page, useSKillList auto recall, just don't need using refetchSkillList
        setCurrentPage(currentPage - 1);
      } else {
        refetchSkillList();
      }
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
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-1/2">
                    <Input
                      label="スキル名"
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
          PermissionsSystem.SKILL_ADD,
        ) && (
          <div className="flex justify-end">
            <Link href={pageRouters.CREATE_SKILLS.href} className={'flex'}>
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
              <span>スキル名</span>
            </th>
            <th className="w-20">操作</th>
          </TableHeader>
          <TableBody>
            {dataSkills && dataSkills.length ? (
              dataSkills.map((element, index) => (
                <tr key={index}>
                  <td className="w-3">{element.id}</td>

                  <td className="text-left w-[350px] max-w-[350px] truncate">
                    {element.name}
                  </td>

                  <td className="w-20">
                    <div className="flex w-full gap-2 justify-center items-center">
                      <Link
                        onClick={() => {
                          setDataSkillDetail(element);
                        }}
                        href={pageRouters.DETAIL_SKILLS.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-5 h-5 hover:cursor-pointer"
                        />
                      </Link>
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.SKILL_UPDATE,
                      ) ? (
                        <Link
                          onClick={() => {
                            setDataSkillDetail(element);
                          }}
                          href={pageRouters.EDIT_SKILLS.href(`${element.id}`)}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-3.5 h-3.5 hover:cursor-pointer`}
                          />
                        </Link>
                      ) : (
                        <div className="w-3.5 h-3.5"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.SKILL_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className={`w-[13px] h-[15px] hover:cursor-pointer`}
                          onClick={() => handleOpenDeleteSkillModal(element.id)}
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
        {dataSkills && dataSkills.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="スキル"
        onConfirm={handleConfirmDeleteSkill}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListSkills;
