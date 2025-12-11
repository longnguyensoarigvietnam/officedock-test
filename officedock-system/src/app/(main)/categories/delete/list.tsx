'use client';
import { useMutation } from 'react-query';
import React, { Fragment, useContext, useEffect, useState } from 'react';

import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Pagination from '@components/common/Pagination';
import InputSearch from '@components/common/InputSearch';
import Dropdown from '@components/common/Dropdown';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';

import { apiRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import {
  ERROR_RESTORE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
} from '@constants/message';
import { PermissionsSystem } from '@constants/enums';

import { getCategoryFormattedDate } from '@utils/date';
import { hasPermissionInArray } from '@utils';

import useCategoryList from '@hooks/useCategoryList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';

import { Category } from '@interfaces/category';

import api from '@base/api';

const ListCategory = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const { data: session } = useSessionCache();

  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState(false);

  const [selectedCategoryToRestore, setSelectedCategoryToRestore] =
    useState<Category | null>(null);

  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [dataCategories, setDataCategories] = useState<Category[]>([]);

  const [searchCategoryName, setSearchCategoryName] = useState('');
  const debouncedFilterByCategoryName = useDebounceText(
    searchCategoryName,
    1000,
  );
  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    page: 1,
  });
  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedFilterByCategoryName,
      page: 1,
    }));
  }, [debouncedFilterByCategoryName]);

  const { categoryList, refetchCategoryList } = useCategoryList(
    {
      page: debouncedParams.page,
      pageSize,
    },
    {
      name: debouncedParams.search,
      isDeleted: true,
    },
  );

  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (categoryList) {
      setDataCategories(categoryList.results);
      setTotalPages(categoryList.numPages);
    }
  }, [categoryList]);

  // Restore category
  const handleOpenRestoreCategoryModal = (category: Category) => {
    setOpenConfirmRestoreModal(true);
    setSelectedCategoryToRestore(category);
  };

  const handleConfirmRestoreCategory = () => {
    if (selectedCategoryToRestore) {
      setIsLoading(true);
      restoreCategory(String(selectedCategoryToRestore.uuid));
      return;
    }
  };

  const postRestoreCategory = async (uuid: string) => {
    const { data: response } = await api.post(
      apiRouters.CATEGORY_RESTORE(`${uuid}`),
    );
    return response;
  };

  const { mutate: restoreCategory } = useMutation(postRestoreCategory, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_RESTORE_MESSAGE,
      });
      if (dataCategories.length === 1 && debouncedParams.page > 1) {
        // If change current page, useTagList auto recall, just don't need using refetchTagList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchCategoryList();
      }
      setOpenConfirmRestoreModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_RESTORE_MESSAGE);
      setOpenConfirmRestoreModal(false);
      setIsLoading(false);
    },
    onSettled: () => {
      setSelectedCategoryToRestore(null);
    },
  });

  return (
    <Fragment>
      <div className="flex justify-between">
        <InputSearch
          placeholder="カテゴリー名を検索"
          inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none placeholder-[#77858F99]"
          iconClassName="w-[14px] h-[14px]"
          onChange={(e) => {
            setSearchCategoryName(e.target.value);
          }}
        />
      </div>
      <div
        className="w-full p-[30px] bg-[#FFFFFF] rounded-[30px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <Table className="bg-white !rounded-[10px] relative">
          <TableHeader className="!bg-[#F3F3F3]">
            <th className="text-left w-[calc((100%_-_680px))] max-w-[calc(100%_-_680px)] border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium">
                カテゴリー名
              </span>
            </th>
            <th className="text-left w-[140px] max-w-[140px] border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium">
                登録日
              </span>
            </th>
            <th className="text-left w-[140px] max-w-[140px] border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium">
                更新日
              </span>
            </th>
            <th className="text-left w-[400px] max-w-[400px]">
              <span className="text-[#77858F] text-[12px] font-medium">
                登録されているチーム
              </span>
            </th>
          </TableHeader>
          <TableBody>
            {dataCategories && dataCategories.length ? (
              dataCategories.map((element, index) => (
                <tr key={index} className="text-black">
                  <td className="border-r-[1px] border-r-[#D2DBE1] w-[calc((100%_-_680px))] max-w-[calc(100%_-_680px)]">
                    <div className="flex justify-between items-center gap-3 w-full">
                      <p className="text-justify w-[90%] max-w-[90%] break-all text-[16px] font-medium">
                        {element.name}
                      </p>
                      <div className="flex w-[10%] justify-end">
                        {session?.user.permissions &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.CATEGORY_DELETE,
                        ) ? (
                          <ImageRound
                            name="Hide"
                            src={'/icons/dark-close-eye.svg'}
                            className={`w-[16px] h-[13px] opacity-80 delete-icon hover:cursor-pointer`}
                            onClick={() => handleOpenRestoreCategoryModal(element)}
                          />
                        ) : (
                          <div className="w-[13px]"></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="border-r-[1px] border-r-[#D2DBE1]">
                    <p className="text-center text-sm font-medium w-[100%] max-w-[100%] break-all">
                      {getCategoryFormattedDate(
                        new Date(element.createdAt || new Date()),
                      )}
                    </p>
                  </td>
                  <td className="border-r-[1px] border-r-[#D2DBE1]">
                    <p className="text-center text-sm font-medium w-[100%] max-w-[100%] break-all">
                      {getCategoryFormattedDate(
                        new Date(element.updatedAt || new Date()),
                      )}
                    </p>
                  </td>
                  <td>
                    <p className="text-justify text-sm font-medium w-[100%] max-w-[100%] break-all">
                      {element.organizations
                        ?.map((org: { id: number; name: string }) => org.name)
                        .join('/ ')}
                    </p>
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
            {dataCategories && dataCategories.length ? (
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
      {openConfirmRestoreModal && (
        <ConfirmRestoreModal
          open={openConfirmRestoreModal}
          message="この業務カテゴリーを復元しますか？"
          name={selectedCategoryToRestore?.name}
          onConfirm={handleConfirmRestoreCategory}
          onClose={() => setOpenConfirmRestoreModal(false)}
        />
      )}
    </Fragment>
  );
};

export default ListCategory;
