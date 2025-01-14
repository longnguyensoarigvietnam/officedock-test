'use client';
import { useMutation } from 'react-query';
import { Transition } from '@headlessui/react';
import React, { useContext, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import DatePicker from '@components/common/DatePicker';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import { Table, TableBody, TableHeader } from '@components/common/Table';

import {
  ERROR_DELETE_MESSAGE,
  NO_DATA_AVAILABLE,
  SUCCESS_DELETE_MESSAGE,
  UNREGISTERED,
} from '@constants/message';
import { STATUS_COMPANY } from '@constants/company';
import { apiRouters, pageRouters } from '@constants/routers';
import useCompanyList from '@hooks/useListCompany';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { Company } from '@interfaces/company';
import { OptionDropdownType } from '@interfaces/common';
import api from '@base/api';
import { formatDateServer, renderDate } from '@utils';
import Link from 'next/link';
import { StatusCompany } from '@constants/enums';

interface FilterCompanyDataType {
  name: string;
  status: OptionDropdownType;
  start_date: string;
  end_date: string;
}

const CompanyList = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { control, register, handleSubmit } = useForm<FilterCompanyDataType>({
    mode: 'onSubmit',
    defaultValues: {
      status: {
        label: 'All',
        value: '',
      },
    },
  });

  const { showToast } = useToast();

  const [isShowing, setIsShow] = useState<boolean>(true);

  // Company state
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [idCompanyChoose, setIdCompanyChoose] = useState<number>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [isOrdering, _setOrdering] = useState<string>('');
  const [isFilter, setFilter] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: '',
  });

  const statusFilter: OptionDropdownType[] = [
    { label: '選択', value: '' },
    ...STATUS_COMPANY,
  ];

  const [totalPages, setTotalPages] = useState<number>(1);

  const { companyList, refetchCompanyList } = useCompanyList(
    currentPage,
    isOrdering,
    isFilter,
  );

  useEffect(() => {
    if (companyList) {
      setDataCompany(companyList.results);
      setTotalPages(companyList.numPages);
    }
  }, [companyList, currentPage]);

  // Handle delete company
  const handleOpenDeleteCompanyModal = (id: number) => {
    setOpenConfirmDeleteModal(true);
    setIdCompanyChoose(id);
  };
  const handleConfirmDeleteCompany = () => {
    if (idCompanyChoose || idCompanyChoose === 0) {
      setIsLoading(true);
      deleteCompany(idCompanyChoose);
      return;
    }
  };

  const postDeleteCompany = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.COMPANY_DETAIL(`${id}`),
    );
    return response;
  };
  const { mutate: deleteCompany } = useMutation(postDeleteCompany, {
    onSuccess: async () => {
      refetchCompanyList();
      setOpenConfirmDeleteModal(false);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
    },
    onError: () => {
      setIsLoading(true);
      showToast({
        description: ERROR_DELETE_MESSAGE,
      });
    },
    onSettled: () => {},
  });

  const onSubmit: SubmitHandler<FilterCompanyDataType> = (data) => {
    setCurrentPage(1);
    setFilter({
      name: data.name || '',
      start_date: data.start_date ? formatDateServer(data.start_date) : '',
      end_date: data.end_date ? formatDateServer(data.end_date) : '',
      status: data.status ? (data.status.value as string) : '',
    });
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case StatusCompany.NOT_YET:
        return (
          <div className="w-fit rounded-3xl px-2.5 py-0.5 bg-red-50 text-red-700 text-sm">
            未締結
          </div>
        );
      case StatusCompany.ALREADY:
        return (
          <div className="w-fit rounded-3xl px-2.5 py-0.5 bg-green-50 text-green-700 text-sm">
            締結済み
          </div>
        );
      default:
        break;
    }
  };
  return (
    <>
      <div className="flex flex-col border rounded-lg">
        <div className="flex justify-between px-3 py-4 rounded-t-lg border-b bg-gray-100">
          <span className="text-gray-700 text-base font-medium">検索</span>
          <ImageRound
            name="Filter extend icon"
            src={'/icons/arrow-down.svg'}
            className={`w-4 h-4 cursor-pointer ${!isShowing && 'rotate-180'}`}
            onClick={() => setIsShow(!isShowing)}
          />
        </div>
        <Transition
          show={isShowing}
          enter="transition-transform duration-300 ease-out"
          enterFrom="transform -translate-y-[10%]"
          enterTo="transform translate-y-0"
          leave="transition-transform duration-150 ease-in"
          leaveFrom="transform translate-y-0"
          leaveTo="transform -translate-y-[10%]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex gap-4 p-4">
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Input
                      label="会社名"
                      placeholder="文字入力"
                      register={register('name')}
                    />
                  </div>
                </div>
                <div className="w-full flex items-end gap-1">
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="start_date"
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          label="契約開始日"
                          placeholder="yyyy/mm/dd"
                          selected={value ? new Date(value) : null}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                  <p className="mb-3">~</p>
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="end_date"
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          label="契約終了日"
                          placeholder="yyyy/mm/dd"
                          selected={value ? new Date(value) : null}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/2 flex flex-col gap-2">
                <div className="w-full flex items-end gap-4">
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="status"
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="契約状態"
                          options={statusFilter}
                          className="w-1/2"
                          selectedOption={statusFilter.find(
                            (element) => element.value === value?.value,
                          )}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end py-2 px-4">
              <Button
                type="submit"
                variant="secondary"
                className="w-28 !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent">
                絞り込み
              </Button>
            </div>
          </form>
        </Transition>
      </div>
      <div className="w-full">
        <Table className="bg-white !rounded-lg ">
          <TableHeader>
            <th className="w-16">ID</th>
            <th className=" w-[302px] max-w-[302px] 2xl:w-[420px] 2xl:max-w-[420px]">
              <div className="flex w-full items-center gap-2">
                <span>会社名</span>
              </div>
            </th>
            <th className="w-52">
              <div className="flex w-full items-center gap-2">
                <span>契約開始日</span>
              </div>
            </th>
            <th className="w-52">
              <div className="flex w-full items-center gap-2 ">
                <span>契約終了日</span>
              </div>
            </th>
            <th className="w-32">
              <span>契約状態</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataCompany && dataCompany.length ? (
              dataCompany.map((company, index) => (
                <tr key={index}>
                  <td className="w-16">{company.id}</td>
                  <td className="text-left w-[302px] max-w-[302px] 2xl:w-[420px] 2xl:max-w-[420px] truncate">
                    {company.name}
                  </td>
                  <td className="text-left w-52">
                    {company.contract?.startDate
                      ? renderDate(company.contract.startDate)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left w-52">
                    {company.contract?.endDate
                      ? renderDate(company.contract.endDate)
                      : UNREGISTERED}
                  </td>
                  <td className="w-32">
                    <div className="flex justify-center items-center">
                      {company.contract?.status
                        ? renderStatus(company.contract.status)
                        : renderStatus('未締結')}
                    </div>
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center ">
                      <Link
                        href={pageRouters.COMPANY_DETAIL.href(`${company.id}`)}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 cursor-pointer hover:opacity-60"
                        />
                      </Link>
                      <Link
                        href={pageRouters.COMPANY_EDIT.href(`${company.id}`)}>
                        <ImageRound
                          name="Edit"
                          src={'/icons/edit.svg'}
                          className="w-6 h-6 cursor-pointer hover:opacity-60"
                        />
                      </Link>
                      <ImageRound
                        name="Delete "
                        onClick={() =>
                          handleOpenDeleteCompanyModal(company?.id)
                        }
                        src={'/icons/delete.svg'}
                        className="w-6 h-6 cursor-pointer hover:opacity-60"
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="relative py-5 text-center text-sm leading-6">
                <td className="h-16" />
                <td className="absolute top-1/2 left-1/2 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center">
        {dataCompany && dataCompany.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="会社"
        onConfirm={handleConfirmDeleteCompany}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </>
  );
};

export default CompanyList;
