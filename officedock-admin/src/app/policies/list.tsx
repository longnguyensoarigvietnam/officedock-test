'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import Link from 'next/link';
import { useMutation } from 'react-query';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';
import DatePicker from '@components/common/DatePicker';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  NO_DATA_AVAILABLE,
  SUCCESS_DELETE_MESSAGE,
  UNREGISTERED,
} from '@constants/message';
import { STATUS_TERM } from '@constants/term';
import { StatusTerm, TermType } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { CreateTermFormData, Term } from '@interfaces/term';
import { OptionDropdownType } from '@interfaces/common';
import useListTerm from '@hooks/useListTerm';
import { renderDate } from '@utils';
import { formatDate } from '@utils/date';
import api from '@base/api';

const ListPolicies = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const [showFilter, setShowFilter] = useState(true);
  const [dataPolicies, setDataPolicies] = useState<Term[]>([]);
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const [maxDatePlan, setMaxDatePlan] = useState<Date | null>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { control, register, handleSubmit } = useForm<CreateTermFormData>({
    mode: 'onSubmit',
  });
  const [filterRequest, setFilterRequest] = useState({
    title: '',
    status: '',
    periodStart: '',
    periodEnd: '',
  });

  // TODO: Update logic sort for multi column
  const [orderingRequest, _setOrderingRequest] = useState('');

  // Set ID policy for delete
  const [idPolicyChoose, setIdPolicyChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const statusFilter: OptionDropdownType[] = [
    {
      label: '選択',
      value: '選択',
    },
    ...STATUS_TERM,
  ];

  const { termList, refetchTermList } = useListTerm(
    {
      page: currentPage,
    },
    {
      title: filterRequest.title,
      status: filterRequest.status,
      periodStart: filterRequest.periodStart
        ? formatDate(filterRequest.periodStart)
        : null,
      periodEnd: filterRequest.periodEnd
        ? formatDate(filterRequest.periodEnd)
        : null,
    },
    orderingRequest,
    TermType.PRIVACY_POLICY,
  );

  const renderStatus = (status: string) => {
    switch (status) {
      case StatusTerm.DRAFT:
        return (
          <div className="w-fit rounded-3xl px-2.5 py-0.5 bg-red-50 text-red-700 text-sm">
            {status}
          </div>
        );
      case StatusTerm.PUBLIC:
        return (
          <div className="w-fit rounded-3xl px-2.5 py-0.5 bg-green-50 text-green-700 text-sm">
            {status}
          </div>
        );
      default:
        break;
    }
  };

  useEffect(() => {
    if (termList) {
      setDataPolicies(termList.results);
      setTotalPages(termList.numPages);
    }
  }, [termList]);

  const onSubmit: SubmitHandler<CreateTermFormData> = (data) => {
    let filterStatus;
    if ((data.status as OptionDropdownType).value != '選択') {
      filterStatus = encodeURIComponent(
        `${(data.status as OptionDropdownType).value}`,
      );
    } else {
      filterStatus = '';
    }
    setCurrentPage(1);
    setFilterRequest({
      title: data.title ? encodeURIComponent(`${data.title}`) : '',
      status: filterStatus,
      periodStart: data.periodStart
        ? encodeURIComponent(`${formatDate(data.periodStart)}`)
        : '',
      periodEnd: data.periodEnd
        ? encodeURIComponent(`${formatDate(data.periodEnd)}`)
        : '',
    });
  };

  // Delete policy
  const handleOpenDeletePolicyModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdPolicyChoose(id);
  };

  const handleConfirmDeletePolicy = () => {
    if (idPolicyChoose) {
      setIsLoading(true);
      deletePolicy(idPolicyChoose);
      return;
    }
  };

  const postDeletePolicy = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.TERM_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deletePolicy } = useMutation(postDeletePolicy, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (termList?.results.length === 1 && currentPage > 1) {
        // If change current page, useListUser auto recall, just don't need using refetchUserList
        setCurrentPage(currentPage - 1);
      } else {
        refetchTermList();
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
                <div className="w-1/2 flex flex-col gap-2">
                  <div className="w-full flex items-end gap-4">
                    <div className="w-[48.8%]">
                      <Controller
                        control={control}
                        name="status"
                        defaultValue={statusFilter[0]}
                        render={({ field: { onChange, value } }) => (
                          <Dropdown
                            label="ステータス"
                            options={statusFilter}
                            className="w-full"
                            selectedOption={statusFilter.find(
                              (element) =>
                                element.value ===
                                (value as OptionDropdownType).value,
                            )}
                            onChange={onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full flex gap-3">
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-1">
                  <div className="w-1/2 h-20">
                    <Controller
                      control={control}
                      name="periodStart"
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          label="有効期間開始日"
                          placeholder="yyyy/mm/dd"
                          selected={value ? new Date(value) : null}
                          onChange={(e) => {
                            onChange(e);
                            if (e !== null) {
                              const newDate = new Date(e.getTime());
                              setMinDatePlan(newDate);
                            } else {
                              setMinDatePlan(null);
                            }
                          }}
                          maxDate={
                            maxDatePlan
                              ? new Date(
                                  maxDatePlan.getTime() - 24 * 60 * 60 * 1000,
                                )
                              : undefined
                          }
                        />
                      )}
                    />
                  </div>
                  <p className="mb-4">~</p>
                  <div className="w-1/2 h-20">
                    <Controller
                      control={control}
                      name="periodEnd"
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          label="有効期間終了日"
                          placeholder="yyyy/mm/dd"
                          selected={value ? new Date(value) : null}
                          onChange={(e) => {
                            onChange(e);
                            if (e !== null) {
                              const newDate = new Date(e.getTime());
                              setMaxDatePlan(newDate);
                            } else {
                              setMaxDatePlan(null);
                            }
                          }}
                          minDate={
                            minDatePlan
                              ? new Date(
                                  minDatePlan.getTime() + 24 * 60 * 60 * 1000,
                                )
                              : undefined
                          }
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full">
              <Input
                label="タイトル"
                placeholder="タイトルを入力してください"
                register={register('title')}
              />
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
        <Link href={pageRouters.POLICY_CREATE.href}>
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
              <span>タイトル</span>
            </th>
            <th className="text-left w-[357px] max-w-[357px]">
              <span>有効期間開始日</span>
            </th>
            <th className="text-left w-[357px] max-w-[357px]">
              <span>有効期間終了日</span>
            </th>
            <th className="text-left w-[357px] max-w-[357px]">
              <span>ステータス</span>
            </th>
            <th className="w-44">操作</th>
          </TableHeader>
          <TableBody>
            {dataPolicies && dataPolicies.length ? (
              dataPolicies.map((element, index) => (
                <tr key={index}>
                  <td className="w-16">{element.id}</td>
                  <td className="text-left whitespace-nowrap w-[357px] max-w-[357px] truncate">
                    {element.title}
                  </td>
                  <td className="text-left w-[370px] max-w-[370px] truncate">
                    {element.periodStart
                      ? renderDate(`${element.periodStart}`)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left whitespace-nowrap w-[357px] max-w-[357px] truncate">
                    {element.periodEnd
                      ? renderDate(`${element.periodEnd}`)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left w-[370px] max-w-[370px] truncate">
                    {element?.status
                      ? renderStatus(`${element.status}`)
                      : renderStatus('未締結')}
                  </td>
                  <td className="w-52">
                    <div className="flex w-full gap-2 justify-center">
                      <Link
                        href={pageRouters.POLICY_DETAIL.href(`${element.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      <>
                        <Link
                          href={pageRouters.POLICY_EDIT.href(`${element.id}`)}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-6 h-6 hover:cursor-pointer`}
                          />
                        </Link>
                        {element.isConfirmed == false ? (
                          <>
                            <ImageRound
                              name="Delete"
                              src={'/icons/delete.svg'}
                              className={`w-6 h-6 hover:cursor-pointer`}
                              onClick={() =>
                                handleOpenDeletePolicyModal(element.id)
                              }
                            />
                          </>
                        ) : (
                          <div className="w-6 h-6"></div>
                        )}
                      </>
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
        {dataPolicies && dataPolicies.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="プライバシーポリシー"
        onConfirm={handleConfirmDeletePolicy}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListPolicies;
