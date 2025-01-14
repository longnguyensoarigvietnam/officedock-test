'use client';

import { Fragment, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { Transition } from '@headlessui/react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';

import api from '@base/api';

import { NO_DATA_AVAILABLE } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import { PermissionsSystem } from '@constants/enums';

import useTagList from '@hooks/useTagList';
import useCreationPersonInCharge from '@hooks/useCreationPersonInCharge';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { TagStateContext } from '@providers/TagProvider';

import { TagFilterFormData, Tags } from '@interfaces/tag';
import { OptionDropdownType } from '@interfaces/common';
import { Profile } from '@interfaces/user';
import { hasPermissionInArray } from '@utils';
import { useErrorToast } from '@hooks/useErrorToast';

const ListTags = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { setDataTagDetail } = useContext(TagStateContext);
  const { data: session } = useSession();

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [showFilter, setShowFilter] = useState(true);
  const [dataTags, setDataTags] = useState<Tags[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterRequest, setFilterRequest] = useState({
    name: '',
    personInCharge: '',
  });
  const [orderingRequest, _setOrderingRequest] = useState('');

  // Set ID tag for delete
  const [idTagChoose, setIdTagChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const [dataPersonInCharge, setDataPersonInCharge] = useState<
    Omit<Profile, 'birthday' | 'gender'>[]
  >([]);
  const [personInChargeOptions, setPersonInChargeOptions] = useState<
    OptionDropdownType[]
  >([]);

  // Loading dropdown
  const [isLoadingPersonInCharge, setIsLoadingPersonInCharge] =
    useState<boolean>(true);

  const { creationPersonInChargeData } = useCreationPersonInCharge({
    onSettled: () => {
      setIsLoadingPersonInCharge(false);
    },
  });

  useEffect(() => {
    if (creationPersonInChargeData) {
      setDataPersonInCharge(creationPersonInChargeData);
    }
  }, [creationPersonInChargeData]);

  useEffect(() => {
    if (dataPersonInCharge) {
      setPersonInChargeOptions([
        {
          label: '選択',
          value: '',
        },
        ...dataPersonInCharge.map((item) => ({
          label: item.fullName,
          value: item.fullName,
        })),
      ]);
    }
  }, [dataPersonInCharge]);

  const { tagList, refetchTagList } = useTagList(
    { page: currentPage },
    {
      tagName: filterRequest.name,
      personInChargeName: filterRequest.personInCharge,
    },
    orderingRequest,
  );

  const { register, control, handleSubmit } = useForm<TagFilterFormData>({
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (tagList) {
      setDataTags(tagList.results);
      setTotalPages(tagList.numPages);
    }
  }, [tagList]);

  const onSubmit: SubmitHandler<TagFilterFormData> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      name: encodeURIComponent(`${data.name}`) || '',
      personInCharge: data.personInCharge?.value
        ? encodeURIComponent(`${data.personInCharge?.value}`)
        : '',
    });
  };

  // Delete tag
  const handleOpenDeleteTagModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdTagChoose(id);
  };

  const handleConfirmDeleteTag = () => {
    if (idTagChoose) {
      setIsLoading(true);
      deleteTag(idTagChoose);
      return;
    }
  };

  const postDeleteTag = async (id: number) => {
    const { data: response } = await api.delete(apiRouters.TAG_DETAIL(`${id}`));
    return response;
  };

  const { mutate: deleteTag } = useMutation(postDeleteTag, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (tagList?.results.length === 1 && currentPage > 1) {
        // If change current page, useTagList auto recall, just don't need using refetchTagList
        setCurrentPage(currentPage - 1);
      } else {
        refetchTagList();
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
                      label="集計タグ"
                      placeholder="入力してください"
                      register={register('name')}
                    />
                  </div>
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name={'personInCharge'}
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="責任者"
                          isLoading={isLoadingPersonInCharge}
                          options={personInChargeOptions}
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
            PermissionsSystem.TAG_ADD,
          ) && (
            <Link href={pageRouters.CREATE_TAG.href}>
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
            <th className="w-[425px] max-w-[425px] text-left">
              <span>集計タグ</span>
            </th>
            <th className="w-[425px] max-w-[425px] text-left">
              <span>責任者</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataTags && dataTags.length ? (
              dataTags.map((element, index) => (
                <tr key={index}>
                  <td className="w-20">{element.id}</td>
                  <td className="w-[425px] max-w-[425px] text-left truncate">
                    {element.name}
                  </td>
                  <td className="w-[425px] max-w-[425px] text-left truncate">
                    {element?.responsiblePerson?.profile.fullName}
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        onClick={() => {
                          setDataTagDetail(element);
                        }}
                        href={pageRouters.DETAIL_TAG.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.TAG_UPDATE,
                      ) ? (
                        <Link
                          onClick={() => {
                            setDataTagDetail(element);
                          }}
                          href={pageRouters.EDIT_TAG.href(`${element.id}`)}>
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
                        PermissionsSystem.TAG_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                          onClick={() => handleOpenDeleteTagModal(element.id)}
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
        {dataTags && dataTags.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="集計タグ"
        onConfirm={handleConfirmDeleteTag}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListTags;
