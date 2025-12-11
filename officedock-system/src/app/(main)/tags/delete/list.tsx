'use client';

import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import Link from 'next/link';
import { AxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';
import { FilterOrganizationComponent } from '@components/tag/FilterOrganizationComponent';
import InputSearch from '@components/common/InputSearch';
import Dropdown from '@components/common/Dropdown';

import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_RESTORE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
} from '@constants/message';

import useTagList from '@hooks/useTagList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { Tags } from '@interfaces/tag';
import { OptionDropdownType } from '@interfaces/common';
import { Organizations } from '@interfaces/organization';

import api from '@base/api';

const ListDeleteTags = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [dataOrganizationList, setDataOrganizationList] = useState<
    OptionDropdownType[]
  >([]);
  const [organizationLabels, setOrganizationLabels] = useState<
    OptionDropdownType[]
  >([]);
  const [debouncedParams, setDebouncedParams] = useState<{
    search: string;
    page: number;
  }>({
    search: '',
    page: 1,
  });

  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [dataTags, setDataTags] = useState<Tags[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterRequest, setFilterRequest] = useState<{
    name: string;
    organizationIds: string;
  }>({
    name: '',
    organizationIds: '',
  });

  // Set ID tag for restore
  const [selectedTagToRestore, setSelectedTagToRestore] = useState<Tags | null>(
    null,
  );

  // Actions
  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState(false);

  // Search
  const { register, watch, getValues, setValue } = useForm<{
    name: string;
    organizationIds: OptionDropdownType[];
  }>({
    defaultValues: {
      name: '',
      organizationIds: [],
    },
  });
  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useCreationDataCommon({
    options: {
      get_all_organizations: true,
    },
    onSuccess: (data) => {
      setDataOrganizationList(
        data.allOrganizations?.map((org) => ({
          label: org.name,
          value: org.id as number,
        })) || [],
      );
    },
  });

  const { refetchTagList } = useTagList({
    pagination: { page: debouncedParams.page, pageSize },
    filter: {
      tagName: debouncedParams.search,
      organizationIds: filterRequest.organizationIds,
      isHidden: true,
    },
    onSuccess: (data) => {
      setDataTags(data.results);
      setTotalPages(data.numPages);
    },
  });

  const debouncedFilterByTagName = useDebounceText(watch('name'), 1000);

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedFilterByTagName,
      page: 1,
    }));
  }, [debouncedFilterByTagName]);

  const handleFilterTagByOrganizations = () => {
    setFilterRequest((prev) => ({
      ...prev,
      organizationIds: encodeURIComponent(
        watch('organizationIds')
          ? watch('organizationIds')
            .map((org: OptionDropdownType) => org.value)
            .join(',')
          : '',
      ),
    }));
    setDebouncedParams((prev) => ({
      ...prev,

      page: 1,
    }));
    setOrganizationLabels(watch('organizationIds'));
    setIsOpenModalFilter(false);
  };

  // Restore tag
  const handleOpenRestoreTagModal = (tag: Tags) => {
    setOpenConfirmRestoreModal(true);
    setSelectedTagToRestore(tag);
  };

  const handleConfirmRestoreTag = () => {
    if (selectedTagToRestore) {
      setIsLoading(true);
      restoreTag(Number(selectedTagToRestore.id));
      return;
    }
  };

  const postRestoreTag = async (id: number) => {
    const { data: response } = await api.post(apiRouters.TAG_RESTORE(`${id}`));
    return response;
  };

  const { mutate: restoreTag } = useMutation(postRestoreTag, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_RESTORE_MESSAGE,
      });
      if (dataTags.length === 1 && debouncedParams.page > 1) {
        // If change current page, useTagList auto recall, just don't need using refetchTagList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchTagList();
      }
      setOpenConfirmRestoreModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_RESTORE_MESSAGE);
      setOpenConfirmRestoreModal(false);
      setIsLoading(false);
    },
    onSettled: () => {
      setSelectedTagToRestore(null);
    },
  });

  return (
    <Fragment>
      <div className="flex justify-between">
        <div className="flex items-center gap-[10px]">
          <p className="text-black font-medium text-[26px] leading-[1]">
            タグ管理
          </p>
          <div className="text-xs flex items-center gap-1">
            <ImageRound
              name="Hide"
              src={'/icons/dark-close-eye.svg'}
              className={`w-[16px] h-[13px] opacity-80`}
            />
            <span className="text-[#77858F] text-xs font-medium">
              非表示一覧
            </span>
          </div>
        </div>
        <Link
          href={pageRouters.TAGS_MANAGEMENT.href}
          className="flex items-center hover:cursor-pointer">
          <p className="ml-1 text-[#77858F] font-medium text-xs">表示中一覧</p>
          <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
            <ImageRound
              name="Filter extend icon"
              src={'/icons/arrow-down.svg'}
              className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
            />
          </div>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-5 items-center">
          <InputSearch
            placeholder="タグを検索"
            inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none !placeholder-[#77858F99]"
            iconClassName="w-[14px] h-[14px]"
            register={register('name')}
          />
          <Popover className="relative">
            {() => (
              <>
                <div className="flex items-center gap-2">
                  <PopoverButton
                    onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                    className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                    <ImageRound
                      src="/icons/filter.svg"
                      name="Filter icon"
                      className="w-[14px] h-[14px]"
                    />
                  </PopoverButton>
                </div>
                <Transition
                  as={Fragment}
                  show={isOpenModalFilter}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1">
                  <PopoverPanel className="absolute left-0 top-5 z-[1] w-[400px] transform">
                    <FilterOrganizationComponent
                      dataOrganizationList={dataOrganizationList}
                      selectedOptions={watch('organizationIds') ?? []}
                      onChange={(selected) => {
                        let updatedTagIds = [];
                        const currentTagIds =
                          getValues('organizationIds') || [];
                        const foundItemIndex = currentTagIds.findIndex(
                          (tag) => tag.value == selected.value,
                        );
                        if (foundItemIndex == -1) {
                          updatedTagIds = [...currentTagIds, selected];
                        } else {
                          updatedTagIds = currentTagIds.filter(
                            (tag) => tag.value != selected.value,
                          );
                        }
                        setValue('organizationIds', updatedTagIds);
                      }}
                      onSubmit={handleFilterTagByOrganizations}
                      onClose={() => {
                        setIsOpenModalFilter(false);
                      }}
                    />
                  </PopoverPanel>
                </Transition>
              </>
            )}
          </Popover>
          <div className="flex gap-2">
            {organizationLabels &&
              organizationLabels?.length > 0 &&
              organizationLabels.slice(0, 3).map((organizationLabel) => {
                return (
                  <div
                    key={organizationLabel.value}
                    className="w-[130px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#F8FAFC]">
                    <span className="w-[120px] truncate">
                      {organizationLabel.label}
                    </span>
                    <ImageRound
                      src={`/icons/close.svg`}
                      name="close"
                      className="w-fit h-fit cursor-pointer"
                      onClick={() => {
                        let updatedTagIds = [];
                        const currentTagIds =
                          getValues('organizationIds') || [];
                        updatedTagIds = currentTagIds.filter(
                          (tag) => tag.value != organizationLabel.value,
                        );
                        setValue('organizationIds', updatedTagIds);
                        setFilterRequest((prev) => ({
                          ...prev,
                          organizationIds: encodeURIComponent(
                            updatedTagIds
                              ? updatedTagIds
                                .map((org: OptionDropdownType) => org.value)
                                .join(',')
                              : '',
                          ),
                        }));
                        setDebouncedParams((prev) => ({
                          ...prev,
                          page: 1,
                        }));
                        setOrganizationLabels(updatedTagIds);
                      }}
                    />
                  </div>
                );
              })}
            {organizationLabels && organizationLabels.length > 3 && (
              <p className="px-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#F8FAFC] text-black text-xs font-medium">
                +{organizationLabels.length - 3}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="w-full p-[30px] bg-[#FFFFFF] rounded-[30px]">
        <Table className="bg-white !rounded-[10px] relative">
          <TableHeader className="!bg-[#F3F3F3]">
            <th className="w-[500px] max-w-[500px] text-left border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium leading-[1]">
                タグ名
              </span>
            </th>
            <th className="w-[calc(100%_-_500px)] text-left !pl-[14px] !pr-[18px]">
              <span className="text-[#77858F] text-[12px] font-medium leading-[1]">
                表示するチーム
              </span>
            </th>
          </TableHeader>
          <TableBody>
            {dataTags && dataTags.length ? (
              dataTags.map((element, index) => (
                <tr key={index}>
                  <td className="w-[500px] text-black max-w-[500px] border-r-[1px] border-r-[#D2DBE1] !pl-[18px] !pr-[14px]">
                    <div className="flex justify-between items-center">
                      <p className="text-left max-w-[calc(100%_-_30px)] break-all text-[16px] font-medium !pl-[14px] !pr-[18px]">
                        {element.name}
                      </p>
                      {element.actions?.update ? (
                        <div onClick={() => handleOpenRestoreTagModal(element)}>
                          <ImageRound
                            name="Hide"
                            src={'/icons/dark-close-eye.svg'}
                            className={`w-[16px] h-[12px] hover:cursor-pointer `}
                          />
                        </div>
                      ) : (
                        <div className="w-[16px]"></div>
                      )}
                    </div>
                  </td>
                  <td className="!w-[calc(100%_-_500px)] text-black !break-all text-left text-[14px] font-medium !pl-[14px] !pr-[18px]">
                    <div className='flex justify-between items-center'>
                      <p className='max-w-[calc(100%-50px)]'>{element?.organizations &&
                        element?.organizations
                          .map((org: Organizations) => org.name)
                          .join('/ ')}</p>
                      <div className="min-w-4">
                        {element.isCalendarOrganizationCheck && (
                          <ImageRound
                            className={`w-4 h-4`}
                            name="Calendar icon"
                            src="/icons/calendar-time.svg"
                          />
                        )}
                      </div>
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
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataTags && dataTags.length ? (
              <Pagination
                onChange={(pageNumber) =>
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }))
                }
                currentPage={debouncedParams.page}
                totalPages={totalPages}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[66px]">
              <Dropdown
                options={PAGE_SIZE_OPTIONS}
                selectedOption={PAGE_SIZE_OPTIONS.find(
                  (element) => element.value == pageSize,
                )}
                className="h-[34px] !w-full !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                classNameTextData="!text-xs"
                classActive="!text-sm"
                classNameOption="!text-sm !border-[#77858F] !ring-[#77858F] !ring-opacity-100 !bottom-full !mb-1"
                labelOptionClass="!text-sm font-medium !pl-1.5"
                onChange={(e) => {
                  setPageSize(Number(e.value));
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: 1,
                  }));
                }}
              />
            </div>
            <p className="text-sm">件ずつ表示</p>
          </div>
        </div>
      </div>

      <ConfirmRestoreModal
        open={openConfirmRestoreModal}
        message="このタグを復元しますか？"
        name={selectedTagToRestore?.name}
        onConfirm={handleConfirmRestoreTag}
        onClose={() => setOpenConfirmRestoreModal(false)}
      />
    </Fragment>
  );
};

export default ListDeleteTags;
