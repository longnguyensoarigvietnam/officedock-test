'use client';
import { Transition } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import Link from 'next/link';

import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import DatePicker from '@components/common/DatePicker';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Pagination from '@components/common/Pagination';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import MonthPicker from '@components/common/DatePicker/MonthPicker';

import { NO_DATA_AVAILABLE, UNREGISTERED } from '@constants/message';
import { pageRouters } from '@constants/routers';
import { DATE_FORMAT, MONTH_FORMAT } from '@constants';

import useCompanyList from '@hooks/useListCompany';
import useCommonCreationData from '@hooks/useCommonCreationData';

import { Company } from '@interfaces/company';
import { OptionDropdownType } from '@interfaces/common';

import { formatDateServer, formatMonthServer, renderDate } from '@utils';

interface FilterCompanyDataType {
  name: string;
  user_amount: string;
  status: OptionDropdownType;
  plan: OptionDropdownType;
  start_date: string;
  end_date: string;
  next_renewal_at: string;
  contract_created_at: string;
}

const CompanyList = () => {
  const { control, register, setValue, handleSubmit } =
    useForm<FilterCompanyDataType>({
      mode: 'onSubmit',
      defaultValues: {
        status: {
          label: 'すべて',
          value: '',
        },
        plan: {
          label: 'すべて',
          value: '',
        },
      },
    });

  const [isShowing, setIsShow] = useState<boolean>(true);

  // Company state
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filter, setFilter] = useState({
    name: '',
    user_amount: '',
    status: '',
    plan: '',
    start_date: '',
    end_date: '',
    next_renewal_at: '',
    contract_created_at: '',
  });

  const [statusOptions, setStatusOptions] = useState<OptionDropdownType[]>([]);
  const [planOptions, setPlanOptions] = useState<OptionDropdownType[]>([]);

  useCommonCreationData({
    options: {
      get_company_status: true,
      get_plans: true,
    },
    onSuccess: (data) => {
      data.companyStatus &&
        setStatusOptions([
          { label: 'すべて', value: '' },
          ...(data?.companyStatus.map((status) => ({
            value: status,
            label: status,
          })) || []),
        ]);

      data.plans &&
        setPlanOptions([
          { label: 'すべて', value: '' },
          ...(data?.plans.map((plan) => ({
            value: plan,
            label: plan,
          })) || []),
        ]);
    },
  });

  const [totalPages, setTotalPages] = useState<number>(1);

  const { companyList } = useCompanyList(currentPage, filter);

  useEffect(() => {
    if (companyList) {
      setDataCompany(companyList.results);
      setTotalPages(companyList.numPages);
    }
  }, [companyList, currentPage]);

  const onSubmit: SubmitHandler<FilterCompanyDataType> = (data) => {
    setCurrentPage(1);
    setFilter({
      name: data.name || '',
      start_date: data.start_date ? formatMonthServer(data.start_date) : '',
      end_date: data.end_date ? formatDateServer(data.end_date) : '',
      next_renewal_at: data.next_renewal_at
        ? formatMonthServer(data.next_renewal_at)
        : '',
      contract_created_at: data.contract_created_at
        ? formatDateServer(data.contract_created_at)
        : '',
      status: data.status ? (data.status.value as string) : '',
      plan: data.plan ? (data.plan.value as string) : '',
      user_amount: data.user_amount || '',
    });
  };

  const handleClearFilterForm = () => {
    setValue('name', '');
    setValue('start_date', '');
    setValue('end_date', '');
    setValue('next_renewal_at', '');
    setValue('contract_created_at', '');
    setValue('status', { label: 'すべて', value: '' });
    setValue('plan', { label: 'すべて', value: '' });
    setValue('user_amount', '');
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
            <div className="flex flex-col gap-4 p-4">
              <div className="flex gap-4">
                <div className="w-1/2 flex items-end gap-4">
                  <div className="w-1/2">
                    <Input
                      label="会社名"
                      placeholder="会社名で検索..."
                      register={register('name')}
                    />
                  </div>
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="status"
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="ステータス"
                          options={statusOptions}
                          className="w-1/2"
                          selectedOption={statusOptions.find(
                            (element) => element.value === value?.value,
                          )}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="w-1/2 flex items-end gap-4">
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="plan"
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="契約プラン"
                          options={planOptions}
                          className="w-1/2"
                          selectedOption={planOptions.find(
                            (element) => element.value === value?.value,
                          )}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="w-1/2">
                    <Input
                      label="ユーザー数"
                      placeholder="ユーザー数"
                      type="number"
                      register={register('user_amount')}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1/2 flex items-end gap-4">
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="start_date"
                      render={({ field: { onChange, value } }) => (
                        <MonthPicker
                          label="利用開始月"
                          placeholder="yyyy/mm"
                          selected={value ? new Date(value) : null}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="next_renewal_at"
                      render={({ field: { onChange, value } }) => (
                        <MonthPicker
                          label="次回の更新月"
                          placeholder="yyyy/mm"
                          selected={value ? new Date(value) : null}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="w-1/2 flex items-end gap-4">
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
                  <div className="w-1/2">
                    <Controller
                      control={control}
                      name="contract_created_at"
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          label="申込日"
                          placeholder="yyyy/mm/dd"
                          selected={value ? new Date(value) : null}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end py-2 px-4 gap-5">
              <Button
                type="button"
                variant="outline"
                className="w-28 !text-primary !rounded-lg"
                onClick={handleClearFilterForm}>
                クリア
              </Button>
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
      <div className="hidden">
        <Link href={pageRouters.COMPANY_CREATE.href}>
          <Button className="w-44">新規作成</Button>
        </Link>
      </div>
      <div className="w-full">
        <Table className="bg-white !rounded-lg ">
          <TableHeader>
            <th className="w-10">ID</th>
            <th className="w-40 max-w-40">
              <p className="w-full text-left">会社名</p>
            </th>
            <th className="w-28 max-w-28 text-nowrap">
              <p>ステータス</p>
            </th>
            <th className=" w-28 max-w-28">
              <p className="w-full text-left">契約プラン</p>
            </th>
            <th className="w-28 max-w-28 text-nowrap">ユーザー数</th>
            <th className="w-28 max-w-28 text-nowrap">
              <p className="w-full text-left">利用開始月</p>
            </th>
            <th className="w-28 max-w-28 text-nowrap">
              <p className="w-full text-left">次回の更新月</p>
            </th>
            <th className="w-28 max-w-28 text-nowrap">
              <p className="w-full text-left">契約終了日</p>
            </th>
            <th className="w-28 max-w-28 text-nowrap">
              <p className="w-full text-left">申込日</p>
            </th>
            <th className="w-24 max-w-24">操作</th>
          </TableHeader>
          <TableBody>
            {dataCompany && dataCompany.length ? (
              dataCompany.map((company, index) => (
                <tr key={index}>
                  <td className="w-10">{company.id}</td>
                  <td className="text-left w-40 max-w-40 2xl:w-40 2xl:max-w-40 truncate">
                    {company.name}
                  </td>
                  <td className="w-28">
                    <div className="flex justify-center items-center">
                      {company.status}
                    </div>
                  </td>
                  <td className="text-left w-28 max-w-28 text-nowrap">
                    {company?.plan?.name || ''}
                  </td>
                  <td className="text-center w-28 max-w-28">
                    {company.totalUsers}
                  </td>
                  <td className="text-left w-28 max-w-28">
                    {company.contract?.startDate
                      ? renderDate(company.contract.startDate, MONTH_FORMAT)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left w-28 max-w-28">
                    {company.contract?.nextRenewalAt
                      ? renderDate(company.contract.nextRenewalAt, MONTH_FORMAT)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left w-28 max-w-28 text-nowrap">
                    {company.contract?.endDate
                      ? renderDate(company.contract.endDate, DATE_FORMAT)
                      : UNREGISTERED}
                  </td>
                  <td className="text-left w-28 max-w-28 text-nowrap">
                    {company.contract?.createdAt
                      ? renderDate(company.contract.createdAt, DATE_FORMAT)
                      : UNREGISTERED}
                  </td>

                  <td className="w-24 max-w-24">
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
    </>
  );
};

export default CompanyList;
