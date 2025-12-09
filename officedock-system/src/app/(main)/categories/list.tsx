'use client';
import { useMutation } from 'react-query';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Pagination from '@components/common/Pagination';
import InputSearch from '@components/common/InputSearch';
import Input from '@components/common/Input';
import Dropdown from '@components/common/Dropdown';
import WarningChangeHierarchyCategoryModal from '@components/modals/WarningChangeHierarchyCategoryModal';
import ConfirmHiddenModal from '@components/modals/ConfirmHiddenModal';

import { apiRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { ActionsModal, PermissionsSystem } from '@constants/enums';

import { getCategoryFormattedDate } from '@utils/date';
import { hasPermissionInArray } from '@utils';

import useCategoryList from '@hooks/useCategoryList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';

import { ResponseError } from '@interfaces/response';
import { Category } from '@interfaces/category';

import api from '@base/api';

const ListCategory = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const [warningChangeCategoryModalOpen, setWarningChangeCategoryModalOpen] =
    useState<boolean>(false);
  const [pendingSelection, setPendingSelection] = useState<{
    uuid: string;
    name: string;
  } | null>(null);

  const { data: session } = useSessionCache();

  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [selectedCategoryToDelete, setSelectedCategoryToDelete] =
    useState<Category | null>(null);
  const [selectedCategoryToUpdate, setSelectedCategoryToUpdate] = useState<{
    name: string;
    uuid: string;
    status: boolean;
    action: string;
    showError: boolean;
  }>({
    name: '',
    uuid: '',
    status: false,
    action: '',
    showError: false,
  });
  const categoryNameInputRef = useRef<HTMLInputElement | null>(null);
  const isCreatingRef = useRef(false);
  const isEditingRef = useRef(false);

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
    },
  );

  useEffect(() => {
    if (categoryList) {
      setDataCategories(categoryList.results);
      setTotalPages(categoryList.numPages);
    }
  }, [categoryList]);

  // Edit category name
  const handleEditCategory = async (data: {
    uuid: string | number;
    name: string;
  }) => {
    return await api.patch(apiRouters.CATEGORY_DETAIL(String(data.uuid)), {
      name: data.name,
    });
  };

  const { mutate: editCategory } = useMutation(
    'postEditCategory',
    handleEditCategory,
    {
      onMutate: () => {
        isEditingRef.current = true;
      },
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setSelectedCategoryToUpdate({
          uuid: '',
          name: '',
          status: false,
          action: '',
          showError: false,
        });
        refetchCategoryList();
        isEditingRef.current = false;
      },
      onError: ({
        response,
      }: ResponseError<{
        name?: string[];
        detail?: string[];
      }>) => {
        const errorData = response?.data || {};
        const { name, detail } = errorData;

        const description = name?.[0] || detail?.[0] || ERROR_UPDATE_MESSAGE;

        showToast({
          variant: 'error',
          description,
        });

        setSelectedCategoryToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
        isEditingRef.current = false;
      },
    },
  );

  // Create category
  const handleCreateCategory = async (data: { uuid: string; name: string }) => {
    return await api.post(apiRouters.CATEGORY_LIST, data);
  };

  const { mutate: createCategory } = useMutation(
    'postCreateCategory',
    handleCreateCategory,
    {
      onMutate: () => {
        isCreatingRef.current = true;
      },
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setSelectedCategoryToUpdate({
          uuid: '',
          name: '',
          status: false,
          action: '',
          showError: false,
        });
        refetchCategoryList();
        isCreatingRef.current = false;
      },
      onError: ({
        response,
      }: ResponseError<{
        name?: string[];
        detail?: string[];
      }>) => {
        const errorData = response?.data || {};
        const { name, detail } = errorData;

        const description = name?.[0] || detail?.[0] || ERROR_CREATE_MESSAGE;

        showToast({
          variant: 'error',
          description,
        });

        setSelectedCategoryToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
        isCreatingRef.current = false;
      },
    },
  );

  // Delete category
  const handleOpenDeleteCategoryModal = (category: Category) => {
    setOpenConfirmDeleteModal(true);
    setSelectedCategoryToDelete(category);
  };

  const handleConfirmDeleteCategory = () => {
    if (selectedCategoryToDelete) {
      setIsLoading(true);
      deleteCategory(String(selectedCategoryToDelete.uuid));
      return;
    }
  };

  const postDeleteCategory = async (uuid: string) => {
    const { data: response } = await api.delete(
      apiRouters.CATEGORY_DETAIL(`${uuid}`),
    );
    return response;
  };

  const { mutate: deleteCategory } = useMutation(postDeleteCategory, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
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
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setOpenConfirmDeleteModal(false);
      setIsLoading(false);
    },
    onSettled: () => {
      setSelectedCategoryToDelete(null);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        categoryNameInputRef.current &&
        !categoryNameInputRef.current.contains(event.target) &&
        !event.target.closest('.toast-container') &&
        !event.target.closest('.delete-icon') &&
        !event.target.closest('.edit-icon')
      ) {
        if (selectedCategoryToUpdate.action == ActionsModal.EDIT) {
          if (isEditingRef.current) return;
          const oldCategoryName =
            dataCategories.find(
              (category) => category.uuid == selectedCategoryToUpdate.uuid,
            )?.name || '';
          if (oldCategoryName.trim() != selectedCategoryToUpdate.name.trim()) {
            setWarningChangeCategoryModalOpen(true);
            setPendingSelection({
              uuid: selectedCategoryToUpdate.uuid,
              name: selectedCategoryToUpdate.name,
            });
          } else {
            setSelectedCategoryToUpdate({
              uuid: '',
              name: '',
              status: false,
              action: '',
              showError: false,
            });
          }
        } else {
          if (isCreatingRef.current) return;
          if (selectedCategoryToUpdate.name.trim()) {
            createCategory({
              uuid: String(selectedCategoryToUpdate.uuid),
              name: selectedCategoryToUpdate.name,
            });
          } else {
            setSelectedCategoryToUpdate((prev) => {
              return {
                ...prev,
                showError: true,
              };
            });
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategoryToUpdate.uuid,
    selectedCategoryToUpdate.name,
    selectedCategoryToUpdate.action,
  ]);

  return (
    <Fragment>
      <div className="flex justify-between">
        <InputSearch
          placeholder="カテゴリー名を検索"
          inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none !placeholder-[#77858F99]"
          iconClassName="w-[14px] h-[14px]"
          onChange={(e) => {
            setSearchCategoryName(e.target.value);
          }}
        />
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CATEGORY_ADD,
          ) && (
            <Button
              className="w-[100px] h-[34px] !text-sm !text-nowrap !text-white border-none"
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              onClick={() => {
                const hasEmptyCategory = dataCategories.some(
                  (category) => category.name.trim() === '',
                );
                if (!hasEmptyCategory) {
                  const newUuid = uuidv4();
                  setDataCategories((prev) => [
                    {
                      uuid: newUuid,
                      name: '',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                    ...prev,
                  ]);
                  setSelectedCategoryToUpdate({
                    uuid: newUuid,
                    name: '',
                    status: true,
                    action: ActionsModal.CREATE,
                    showError: false,
                  });
                }
              }}>
              <ImageRound
                src="/icons/add-with-background.svg"
                name="Add icon"
                className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
              />
              新規追加
            </Button>
          )}
      </div>
      <div
        className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <Table className="bg-white !rounded-[10px] relative">
          <TableHeader className="!bg-[#F8FAFC]">
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
                  <td className="border-r-[1px] border-r-[#D2DBE1] w-[calc((100%_-_680px))] max-w-[calc(100%_-_680px)] !pl-[18px]">
                    <div className="flex justify-between items-center gap-3 w-full">
                      {selectedCategoryToUpdate.uuid == element.uuid &&
                      selectedCategoryToUpdate.status ? (
                        <div ref={categoryNameInputRef} className="!w-[90%]">
                          <Input
                            placeholder="カテゴリー名を入力"
                            className={`!border-[1px] !border-[#77858F] ${selectedCategoryToUpdate.showError && '!border-error'} w-full !text-sm !h-[34px]`}
                            defaultValue={element.name}
                            onChange={(e) => {
                              setSelectedCategoryToUpdate((prev) => {
                                return {
                                  ...prev,
                                  name: e.target.value,
                                };
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-justify w-[90%] max-w-[90%] break-all text-[16px] font-medium">
                          {element.name}
                        </p>
                      )}
                      <div className="flex gap-3 w-[10%] justify-end">
                        {session?.user.permissions &&
                        !(
                          selectedCategoryToUpdate.action ==
                            ActionsModal.CREATE &&
                          selectedCategoryToUpdate.uuid == element.uuid
                        ) &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.CATEGORY_UPDATE,
                        ) ? (
                          <div>
                            <ImageRound
                              name="Edit"
                              src={'/icons/edit-gray.svg'}
                              className={`w-3 h-3 edit-icon ${
                                selectedCategoryToUpdate.uuid != element.uuid &&
                                selectedCategoryToUpdate.status
                                  ? 'hover:cursor-not-allowed'
                                  : 'hover:cursor-pointer'
                              } ${(!(selectedCategoryToUpdate.uuid == element.uuid) || selectedCategoryToUpdate.action == ActionsModal.CREATE) && 'opacity-30'}`}
                              onClick={() => {
                                if (
                                  selectedCategoryToUpdate.uuid !=
                                    element.uuid &&
                                  selectedCategoryToUpdate.status
                                )
                                  return;
                                if (
                                  selectedCategoryToUpdate.uuid != element.uuid
                                ) {
                                  setDataCategories((prev) => {
                                    let updatedCategories = [...prev];
                                    updatedCategories =
                                      updatedCategories.filter(
                                        (category) =>
                                          category.uuid !=
                                          selectedCategoryToUpdate.uuid,
                                      );
                                    return updatedCategories;
                                  });
                                }
                                setSelectedCategoryToUpdate({
                                  uuid: element.uuid || '',
                                  name: element.name,
                                  status: true,
                                  action: ActionsModal.EDIT,
                                  showError: false,
                                });
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-3"></div>
                        )}
                        {session?.user.permissions &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.CATEGORY_DELETE,
                        ) ? (
                          <ImageRound
                            name="Hide"
                            src={'/icons/eye.svg'}
                            className={`w-[16px] h-[12px] delete-icon ${
                              selectedCategoryToUpdate.uuid != element.uuid &&
                              selectedCategoryToUpdate.status
                                ? 'hover:cursor-not-allowed'
                                : 'hover:cursor-pointer'
                            }`}
                            onClick={() => {
                              if (
                                selectedCategoryToUpdate.uuid != element.uuid &&
                                selectedCategoryToUpdate.status
                              )
                                return;
                              if (
                                selectedCategoryToUpdate.status &&
                                selectedCategoryToUpdate.action ==
                                  ActionsModal.CREATE
                              ) {
                                setDataCategories((prev) => {
                                  let updatedCategories = [...prev];
                                  updatedCategories = updatedCategories.filter(
                                    (category) =>
                                      category.uuid !=
                                      selectedCategoryToUpdate.uuid,
                                  );
                                  return updatedCategories;
                                });
                              } else {
                                handleOpenDeleteCategoryModal(element);
                              }
                              setSelectedCategoryToUpdate({
                                uuid: '',
                                name: '',
                                status: false,
                                action: '',
                                showError: false,
                              });
                            }}
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
      {openConfirmDeleteModal && (
        <ConfirmHiddenModal
          open={openConfirmDeleteModal}
          name={selectedCategoryToDelete?.name || ''}
          type="業務カテゴリー"
          message="すでに登録したチームカテゴリーは、表示されたままです。"
          message2="あとで「非表示一覧」から復元することも可能です。"
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => {
            setOpenConfirmDeleteModal(false);
            setSelectedCategoryToDelete(null);
          }}
        />
      )}
      {warningChangeCategoryModalOpen && (
        <WarningChangeHierarchyCategoryModal
          open={warningChangeCategoryModalOpen}
          onConfirm={() => {
            if (!pendingSelection) return;

            const { uuid, name } = pendingSelection;
            editCategory({
              uuid,
              name,
            });

            setWarningChangeCategoryModalOpen(false);
            setPendingSelection(null);
          }}
          onClose={() => {
            setSelectedCategoryToUpdate({
              uuid: '',
              name: '',
              status: false,
              action: '',
              showError: false,
            });
            setWarningChangeCategoryModalOpen(false);
            setPendingSelection(null);
          }}
        />
      )}
    </Fragment>
  );
};

export default ListCategory;
