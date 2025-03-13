'use client';

import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import InputSearch from '@components/common/InputSearch';
import ActionsTagModal from '@components/modals/ActionsTagModal';
import Dropdown from '@components/common/Dropdown';

import { NO_DATA_AVAILABLE } from '@constants';
import { apiRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import {
  ActionsModal,
  PermissionsSystem,
  ServerStatusCode,
} from '@constants/enums';

import useTagList from '@hooks/useTagList';
import useOrganizationOptions from '@hooks/useFullOrganizationList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { Tags, TagFormData, TagRequest } from '@interfaces/tag';
import { OptionDropdownType } from '@interfaces/common';
import { Organizations } from '@interfaces/organization';

import { hasPermissionInArray } from '@utils';

import api from '@base/api';

const ListTags = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { data: session } = useSession();

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();
  const { organizationOptions } = useOrganizationOptions({});
  const [dataOrganizationList, setDataOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  const [showFilter, setShowFilter] = useState(true);
  const [dataTags, setDataTags] = useState<Tags[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filterRequest, setFilterRequest] = useState<{
    name: string;
    organizationIds: string;
    isHidden: boolean;
  }>({
    name: '',
    organizationIds: '',
    isHidden: false,
  });
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const actionType = searchParams.get('action');
  const tagId = searchParams.get('tagId');
  const router = useRouter();
  const PAGE_SIZE_OPTIONS = [
    {
      label: '10',
      value: 10,
    },
    {
      label: '20',
      value: 20,
    },
    {
      label: '30',
      value: 30,
    },
  ];

  // Set ID tag for delete
  const [selectedTagToDelete, setSelectedTagToDelete] = useState<Tags | null>();

  // Actions
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [openActionsTagModal, setOpenActionsTagModal] = useState(false);
  const [dataTagEdit, setDataTagEdit] = useState<Tags | null>(null);

  // Search
  const { register, watch, getValues, setValue } = useForm<{
    name: string;
    organizationIds: OptionDropdownType[];
  }>();

  const { refetchTagList } = useTagList({
    pagination: { page: currentPage, pageSize },
    filter: {
      tagName: filterRequest.name,
      organizationIds: filterRequest.organizationIds,
      isHidden: filterRequest.isHidden,
    },
    onSuccess: (data) => {
      setDataTags(data.results);
      setTotalPages(data.numPages);
    },
  });

  useEffect(() => {
    if (organizationOptions) {
      setDataOrganizationList(
        organizationOptions.map((org) => ({
          label: org.name,
          value: org.id as number,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationOptions]);

  const debouncedFilterByTagName = useDebounceText(watch('name'), 1000);
  const debouncedFilterByOrganizations = useDebounceText(
    watch('organizationIds'),
    1000,
  );

  useEffect(() => {
    if (debouncedFilterByTagName) {
      setFilterRequest((prev) => ({
        ...prev,
        name: encodeURIComponent(debouncedFilterByTagName),
      }));
      setCurrentPage(1);
    }
    if (debouncedFilterByOrganizations) {
      setFilterRequest((prev) => ({
        ...prev,
        organizationIds: encodeURIComponent(
          debouncedFilterByOrganizations
            .map((org: OptionDropdownType) => org.value)
            .join(','),
        ),
      }));
      setCurrentPage(1);
    }
  }, [debouncedFilterByTagName, debouncedFilterByOrganizations]);

  const handleSetParam = ({
    id,
    action,
  }: {
    id?: string | null;
    action?: string | null;
  }) => {
    if (id) {
      params.set('tagId', id);
    }
    if (action) {
      params.set('action', action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('tagId');
    params.delete('action');
    router.replace(`?${params.toString()}`);
  };

  // Get tag's detail
  const handleGetDataDetailTag = async (id: string) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.TAG_DETAIL(id));
    return response;
  };

  const { mutate: getDataDetailTag } = useMutation(
    'getDataDetailTag',
    handleGetDataDetailTag,
    {
      onSuccess: async (data) => {
        setDataTagEdit(data);
        setOpenActionsTagModal(true);
      },
      onError: (error: AxiosError) => {
        if (error.response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_COMMON_MESSAGE,
          });
          handleRemoveParam();
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmGetDataDetailTag = (id: string) => {
    getDataDetailTag(id);
  };

  // Create tag
  const handleCreateTag = async (data: TagRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.TAG_LIST, data);
  };

  const { mutate: createTag } = useMutation('postCreateTag', handleCreateTag, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_CREATE_MESSAGE,
      });
      setOpenActionsTagModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_CREATE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleConfirmCreateTag = (data: TagFormData) => {
    const organizationIds = data.organizations.map((org: OptionDropdownType) =>
      Number(org.value),
    );
    createTag({
      name: data.name || '',
      organizationIds,
    });
  };

  // Edit tag
  const handleEditTag = async (data: TagRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TAG_DETAIL(String(tagId)), data);
  };

  const { mutate: editTag } = useMutation('postEditTag', handleEditTag, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setOpenActionsTagModal(false);
      handleRemoveParam();
      refetchTagList();
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
      handleRemoveParam();
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleConfirmEditTag = (data: TagFormData) => {
    const organizationIds = data.organizations.map((org: OptionDropdownType) =>
      Number(org.value),
    );
    editTag({
      name: data.name || '',
      organizationIds,
    });
  };

  // Hide tag
  const handleToggleHideTag = async (data: Tags) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TAG_DETAIL(String(data.id)), {
      isHidden: data.isHidden,
    });
  };

  const { mutate: toggleHideTag } = useMutation(
    'handleToggleHideTag',
    handleToggleHideTag,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        refetchTagList();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmToggleHideTag = (data: Tags) => {
    toggleHideTag({
      id: data.id,
      isHidden: Boolean(data.isHidden),
    });
  };

  // Delete tag
  const handleOpenDeleteTagModal = (tag: Tags) => {
    setOpenConfirmDeleteModal(true);
    setSelectedTagToDelete(tag);
  };

  const handleConfirmDeleteTag = () => {
    if (selectedTagToDelete) {
      setIsLoading(true);
      deleteTag(Number(selectedTagToDelete.id));
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
      if (dataTags.length === 1 && currentPage > 1) {
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
    onSettled: () => {
      setSelectedTagToDelete(null);
    },
  });

  useEffect(() => {
    if (tagId && dataTagEdit == null && actionType) {
      handleConfirmGetDataDetailTag(tagId);
    }
    if (actionType === ActionsModal.CREATE) {
      setOpenActionsTagModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailTag, tagId, actionType]);

  return (
    <Fragment>
      <div className="flex justify-between">
        <p className="text-black font-medium text-[26px]">タグ管理</p>
        <div
          className="flex gap-2 items-center hover:cursor-pointer"
          onClick={() => {
            setCurrentPage(1);
            setFilterRequest((prev) => ({
              ...prev,
              isHidden: !prev.isHidden,
            }));
          }}>
          {!filterRequest.isHidden && (
            <ImageRound
              name="Hide"
              src={'/icons/close-eye.svg'}
              className="w-[15px] h-[12px] hover:cursor-pointer"
            />
          )}

          <p className="text-[#77858F] font-medium text-[12px]">非表示一覧</p>
          <div className="flex justify-between p-[3px] rounded-full bg-white border-b">
            <ImageRound
              name="Filter extend icon"
              src={'/icons/arrow-down.svg'}
              className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
              onClick={() => setShowFilter(!showFilter)}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-4 items-center">
          <InputSearch
            placeholder="タグを検索"
            inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none placeholder-[#77858F99]"
            iconClassName="w-[14px] h-[14px]"
            register={register('name')}
          />
          <ImageRound
            src="/icons/filter.svg"
            name="Filter icon"
            className="!w-4 !h-4 text-gray-400 cursor-pointer"
          />
          <div className="w-[300px]">
            <MultiSelectDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[300px] line-clamp-2 !text-sm"
              options={dataOrganizationList}
              selectedOptions={watch('organizationIds') ?? []}
              customLabel="チーム"
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('organizationIds') || [];
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
            />
          </div>
        </div>
        <div className="flex justify-end">
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.TAG_ADD,
            ) && (
              <Button
                className="w-40"
                onClick={() => {
                  setOpenActionsTagModal(true);
                  handleSetParam({
                    action: ActionsModal.CREATE,
                  });
                }}>
                <ImageRound
                  src="/icons/add-with-background.svg"
                  name="Add icon"
                  className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
                />
                タグの新規追加
              </Button>
            )}
        </div>
      </div>
      <div className="w-full p-5 bg-[#F8FAFC] rounded-[14px]">
        <Table className="bg-white !rounded-lg relative">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="w-[500px] max-w-[500px] text-left border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium">
                タグ名
              </span>
            </th>
            <th className="w-[calc(100%_-_500px)] text-left">
              <span className="text-[#77858F] text-[12px] font-medium">
                表示するチーム
              </span>
            </th>
          </TableHeader>
          <TableBody>
            {dataTags && dataTags.length ? (
              dataTags.map((element, index) => (
                <tr key={index}>
                  <td className="w-[500px] max-w-[500px] flex justify-between items-center border-r-[1px] border-r-[#D2DBE1]">
                    <p className="text-left max-w-[350px] truncate text-[16px] font-medium">
                      {element.name}
                    </p>
                    <div className="flex gap-3 justify-end">
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.TAG_UPDATE,
                      ) ? (
                        <div
                          onClick={() => {
                            handleConfirmGetDataDetailTag(String(element.id));
                            handleSetParam({
                              id: String(element.id),
                              action: ActionsModal.EDIT,
                            });
                          }}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit-gray.svg'}
                            className="w-3.5 h-3.5 hover:cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="w-3.5"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.TAG_UPDATE,
                      ) ? (
                        <div
                          onClick={() => {
                            handleConfirmToggleHideTag({
                              id: element.id,
                              isHidden: !element.isHidden,
                            });
                          }}>
                          <ImageRound
                            name="Hide"
                            src={'/icons/close-eye-gray.svg'}
                            className="w-[17px] h-[14px] hover:cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="w-[17px]"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.TAG_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-gray.svg'}
                          className="w-[13px] h-[15px] hover:cursor-pointer"
                          onClick={() => handleOpenDeleteTagModal(element)}
                        />
                      ) : (
                        <div className="w-[13px]"></div>
                      )}
                    </div>
                  </td>
                  <td className="!w-[calc(100%_-_500px)] !break-words text-left text-[14px] font-medium">
                    {element?.organizations &&
                      element?.organizations
                        .map((org: Organizations) => org.name)
                        .join('/ ')}
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
      <div className="flex justify-center items-center w-full">
        <div className="flex justify-center flex-1">
          {dataTags && dataTags.length ? (
            <Pagination
              onChange={(pageNumber) => setCurrentPage(pageNumber)}
              currentPage={currentPage}
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
              labelOptionClass="!text-sm font-medium !pl-0.5 !border-b-[1px] !border-[#EBF1F7]"
              onChange={(e) => {
                setPageSize(Number(e.value));
              }}
            />
          </div>
          <p className="text-sm">件ずつ表示</p>
        </div>
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        name={selectedTagToDelete?.name || ''}
        type="タグ"
        onConfirm={handleConfirmDeleteTag}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
      {openActionsTagModal && (
        <ActionsTagModal
          open={true}
          action={actionType}
          dataTag={dataTagEdit}
          dataOrganizationList={dataOrganizationList}
          setDataOrganizationList={setDataOrganizationList}
          onClose={() => {
            setOpenActionsTagModal(false);
            handleRemoveParam();
            setDataTagEdit(null);
          }}
          onCreate={(data) => {
            handleConfirmCreateTag(data);
          }}
          onEdit={(data) => {
            handleConfirmEditTag(data);
          }}
        />
      )}
    </Fragment>
  );
};

export default ListTags;
