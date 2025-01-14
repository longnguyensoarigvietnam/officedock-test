'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation } from 'react-query';
import { SubmitHandler, useForm } from 'react-hook-form';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import api from '@base/api';
import { User, UserFilterFormData } from '@interfaces/user';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  NO_DATA_AVAILABLE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import useListUser from '@hooks/useListUser';

const ListUsers = () => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const [showFilter, setShowFilter] = useState(true);
  const [dataUsers, setDataUsers] = useState<User[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { register, handleSubmit } = useForm<UserFilterFormData>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    fullName: '',
    email: '',
  });

  // TODO: Update logic sort for multi column
  const [orderingRequest, _setOrderingRequest] = useState('');

  // Set ID user for delete
  const [idUserChoose, setIdUserChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const { userList, refetchUserList } = useListUser(
    {
      page: currentPage,
    },
    {
      fullName: filterRequest.fullName,
      email: filterRequest.email,
    },
    orderingRequest,
  );

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
      email: encodeURIComponent(`${data.email}`) || '',
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
        // If change current page, useListUser auto recall, just don't need using refetchUserList
        setCurrentPage(currentPage - 1);
      } else {
        refetchUserList();
      }
      setOpenConfirmDeleteModal(false);
    },
    onError: () => {
      showToast({
        description: ERROR_DELETE_MESSAGE,
        variant: 'error',
      });
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
            className={`flex flex-col gap-4 p-4`}
            onSubmit={handleSubmit(onSubmit)}>
            <div className="flex gap-4">
              <div className="w-full flex gap-4">
                <div className="w-1/2">
                  <Input
                    label="名前"
                    placeholder="入力してください"
                    register={register('fullName')}
                  />
                </div>
                <div className="w-1/2">
                  <Input
                    label="メールアドレス"
                    placeholder="入力してください"
                    labelClassName="[&>span]:text-gray-500"
                    register={register('email')}
                  />
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
        <Link href={pageRouters.USER_CREATE.href}>
          <Button className="w-44">新規登録</Button>
        </Link>
      </div>
      <div className="w-full">
        <Table className="bg-white !rounded-lg">
          <TableHeader>
            <th className="w-16">
              <span>ID</span>
            </th>
            <th className="text-left w-[357px] max-w-[357px]">
              <span>名前</span>
            </th>
            <th className="text-left w-[370px] max-w-[370px]">
              <span>メールアドレス</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataUsers && dataUsers.length ? (
              dataUsers.map((element, index) => (
                <tr key={index}>
                  <td className="w-16">{element.id}</td>
                  <td className="text-left whitespace-nowrap w-[357px] max-w-[357px] truncate">
                    {element.profile?.fullName}
                  </td>
                  <td className="text-left w-[370px] max-w-[370px] truncate">
                    {element.email}
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        href={pageRouters.USER_DETAIL.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      <Link href={pageRouters.USER_EDIT.href(`${element.id}`)}>
                        <ImageRound
                          name="Edit"
                          src={'/icons/edit.svg'}
                          className={`w-6 h-6 hover:cursor-pointer`}
                        />
                      </Link>
                      {session?.user.id !== element.id ? (
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
              <tr className="relative py-5 text-center text-sm leading-6">
                <td className="h-16" />
                <td className="absolute whitespace-nowrap top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 py-5 text-center">
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
