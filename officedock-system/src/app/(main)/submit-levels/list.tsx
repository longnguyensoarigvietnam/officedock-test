'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { Transition } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import Dropdown from '@components/common/Dropdown';

import { NO_DATA_AVAILABLE } from '@constants';
import { PermissionsSystem, SubmitLevelStatus } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import { SubmitLevel } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useSubmitLevelList from '@hooks/useSubmitLevelList';
import { getSubmitLevelFormattedDate } from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { SubmitLevelStateContext } from '@providers/SubmitLevelProvider';

const ListSubmitLevels = () => {
  const [showFilter, setShowFilter] = useState(true);
  const { data: session } = useSession();

  const [dataSubmitLevels, setDataSubmitLevels] = useState<SubmitLevel[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterRequest, setFilterRequest] = useState({
    name: '',
    status: '',
  });
  const statusOptions = [
    {
      value: SubmitLevelStatus.PENDING,
      label: SubmitLevelStatus.PENDING,
    },
    {
      value: SubmitLevelStatus.APPROVAL,
      label: SubmitLevelStatus.APPROVAL,
    },
    {
      value: SubmitLevelStatus.REJECTED,
      label: SubmitLevelStatus.REJECTED,
    },
  ];
  const { setDataSubmitLevelDetail } = useContext(SubmitLevelStateContext);

  const { submitLevelList } = useSubmitLevelList(
    { page: currentPage },
    { name: filterRequest.name, status: filterRequest.status },
  );

  const { register, handleSubmit, control } = useForm<{
    name: string;
    status: OptionDropdownType;
  }>({
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (submitLevelList) {
      setDataSubmitLevels(submitLevelList.results);
      setTotalPages(submitLevelList.numPages);
    }
  }, [submitLevelList]);

  const onSubmit: SubmitHandler<{
    name: string;
    status: OptionDropdownType;
  }> = (data) => {
    setFilterRequest({
      name: encodeURIComponent(`${data.name}`) || '',
      status: data.status ? `${data.status.value}` : '',
    });
    setCurrentPage(1);
  };

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
                      label="スキル名"
                      placeholder="入力してください"
                      register={register('name')}
                    />
                  </div>
                  <div className="w-1/4">
                    <Controller
                      control={control}
                      name={'status'}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <Dropdown
                            label="ステータス"
                            options={[
                              {
                                label: '未選択',
                                value: '',
                              },
                              ...statusOptions,
                            ]}
                            placeholder="選択してください"
                            selectedOption={
                              !value
                                ? {
                                    label: '未選択',
                                    value: '',
                                  }
                                : [
                                    {
                                      label: '未選択',
                                      value: '',
                                    },
                                    ...statusOptions,
                                  ].find(
                                    (element) => element.value === value.value,
                                  )
                            }
                            className="w-1/4"
                            onChange={onChange}
                          />
                        );
                      }}
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
      <div className="w-full">
        <Table className="bg-white !rounded-lg relative">
          <TableHeader>
            <th className="w-20">
              <div className="flex w-full items-center justify-center gap-1 hover:cursor-pointer">
                <span>ID</span>
              </div>
            </th>
            <th className="w-[346px] max-w-[346px] text-left">
              <span>スキル名</span>
            </th>
            <th className="w-[346px] max-w-[346px] text-left">
              <span>申請者</span>
            </th>
            <th className="w-36 max-w-[144px]">
              <span>組織</span>
            </th>
            <th className="w-36 max-w-[144px]">
              <span>申請日</span>
            </th>
            <th className="w-36">操作</th>
          </TableHeader>
          <TableBody>
            {dataSubmitLevels && dataSubmitLevels.length ? (
              dataSubmitLevels.map((element, index) => (
                <tr key={index}>
                  <td className="w-20">{element.id}</td>
                  <td className="w-[346px] max-w-[346px] text-left truncate">
                    {element.skill.name}
                  </td>
                  <td className="w-[346px] max-w-[346px] text-left truncate">
                    {element.staff.profile.fullName}
                  </td>
                  <td className="w-36 max-w-[144px] truncate">
                    {element.organization.name}
                  </td>
                  <td className="w-36 max-w-[144px] truncate">
                    {getSubmitLevelFormattedDate(new Date(element.createdAt))}
                  </td>
                  <td className="w-36">
                    <div className="flex w-full gap-2 justify-center items-center">
                      <Link
                        href={pageRouters.DETAIL_SUBMIT_LEVELS.href(
                          `${element.id}`,
                        )}
                        onClick={() => {
                          setDataSubmitLevelDetail(element);
                        }}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-5 h-5 hover:cursor-pointer"
                        />
                      </Link>
                      {element.actions &&
                      element.actions?.update &&
                      !element.isEdited &&
                      session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.SUBMIT_LEVEL_UPDATE,
                      ) ? (
                        <Link
                          href={pageRouters.EDIT_SUBMIT_LEVELS.href(
                            `${element.id}`,
                          )}
                          onClick={() => {
                            setDataSubmitLevelDetail(element);
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
        {dataSubmitLevels && dataSubmitLevels.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
    </Fragment>
  );
};

export default ListSubmitLevels;
