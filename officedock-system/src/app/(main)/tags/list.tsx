'use client';

import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import InputSearch from '@components/common/InputSearch';
import ActionsTagModal from '@components/modals/ActionsTagModal';
import Dropdown from '@components/common/Dropdown';

import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
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
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';
import useTagDetail from '@hooks/useTagDetail';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { Tags, TagFormData, TagRequest } from '@interfaces/tag';
import { OptionDropdownType } from '@interfaces/common';
import { Organizations } from '@interfaces/organization';

import { hasPermissionInArray } from '@utils';

import api from '@base/api';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

const FilterOrganizationComponent = ({
  dataOrganizationList,
  selectedOptions,
  onChange,
  onSubmit,
  onClose,
}: {
  dataOrganizationList: OptionDropdownType[];
  selectedOptions: OptionDropdownType[];
  onChange: (selected: OptionDropdownType) => void;
  onSubmit: () => void;
  onClose: () => void;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-common flex flex-col items-center w-[330px] py-5">
      <div className="w-[300px]">
        <MultiSelectDropdown
          className="!h-[34px] !rounded-md"
          labelClass="!min-h-0 !text-sm font-medium"
          valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
          optionClassName="!border-[1px] !border-[#77858F] w-full"
          labelOptionClass="break-words max-w-[300px]  !text-sm"
          optionsCheckBoxClassName="!max-w-[300px]"
          options={dataOrganizationList}
          selectedOptions={selectedOptions}
          customLabel="チーム"
          onChange={(selected) => {
            onChange(selected);
          }}
        />
      </div>
      <div className="flex justify-center gap-[10px] mt-4 ">
        <Button variant="outline" onClick={onClose} className="h-9">
          キャンセル
        </Button>
        <Button onClick={onSubmit} className="h-9">
          絞り込む
        </Button>
      </div>
    </div>
  );
};

const ListTags = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { data: session } = useSessionCache();

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

  const [showFilter, setShowFilter] = useState(true);
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [dataTags, setDataTags] = useState<Tags[]>([]);
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
  const router = useRouter();
  const [tagIdParam, setTagIdParam] = useState<string | null>(
    searchParams.get('tagId'),
  );
  const [actionTypeParam, setActionTypeParam] = useState<string | null>(
    searchParams.get('action'),
  );

  // Set ID tag for delete and update
  const [selectedTagToDelete, setSelectedTagToDelete] = useState<Tags | null>(
    null,
  );
  const [selectedTagToUpdate, setSelectedTagToUpdate] = useState<number | null>(
    null,
  );

  // Actions
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [openActionsTagModal, setOpenActionsTagModal] = useState(false);
  const [dataTagEdit, setDataTagEdit] = useState<Tags | null>(null);

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
      isHidden: filterRequest.isHidden,
    },
    onSuccess: (data) => {
      setDataTags(data.results);
      setTotalPages(data.numPages);
    },
  });

  useTagDetail({
    tagId: Number(selectedTagToUpdate),
    onSuccess: (data) => {
      setDataTagEdit(data);
      setOpenActionsTagModal(true);
      if (selectedTagToUpdate) {
        handleSetParam({
          id: String(selectedTagToUpdate),
          action: ActionsModal.EDIT,
        });
      }
      setIsLoading(false);
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
        handleRemoveParam();
      }
      setIsLoading(false);
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

  const handleSetParam = ({
    id,
    action,
  }: {
    id?: string | null;
    action?: string | null;
  }) => {
    if (id) {
      params.set('tagId', id);
      setTagIdParam(id);
    }
    if (action) {
      params.set('action', action);
      setActionTypeParam(action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('tagId');
    params.delete('action');
    setTagIdParam(null);
    setActionTypeParam(null);
    router.replace(`?${params.toString()}`);
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
      refetchTagList();
      handleRemoveParam();
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
      calendarOrganizationCheck: data.calendarOrganizationCheck,
    });
  };

  // Edit tag
  const handleEditTag = async (data: TagRequest) => {
    setIsLoading(true);
    return await api.patch(
      apiRouters.TAG_DETAIL(String(selectedTagToUpdate)),
      data,
    );
  };

  const { mutate: editTag } = useMutation('postEditTag', handleEditTag, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setDataTagEdit(null);
      setOpenActionsTagModal(false);
      setSelectedTagToUpdate(null);
      handleRemoveParam();
      refetchTagList();
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
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
      calendarOrganizationCheck: data.calendarOrganizationCheck,
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
      if (dataTags.length === 1 && debouncedParams.page > 1) {
        // If change current page, useTagList auto recall, just don't need using refetchTagList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
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
    if (tagIdParam && !dataTagEdit && actionTypeParam === ActionsModal.EDIT) {
      setSelectedTagToUpdate(Number(tagIdParam));
    }

    if (actionTypeParam === ActionsModal.CREATE && !openActionsTagModal) {
      setOpenActionsTagModal(true);
    }
  }, [tagIdParam, actionTypeParam, dataTagEdit, openActionsTagModal]);

  return (
    <Fragment>
      <div className="flex justify-between">
        <p className="text-black font-medium text-[26px]">タグ管理</p>
        <div className="flex gap-2 items-center hover:cursor-pointer">
          {!filterRequest.isHidden && (
            <ImageRound
              name="Hide"
              src={'/icons/close-eye.svg'}
              className="w-[15px] h-[12px] hover:cursor-pointer"
            />
          )}

          <p className="text-[#77858F] font-medium text-[12px]">
            {!filterRequest.isHidden ? '非表示一覧' : '表示一覧'}
          </p>
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
                      className="w-[14px] h-[14px] ml-2"
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
        <div className="flex justify-end">
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.TAG_ADD,
            ) && (
              <Button
                className="w-[100px] h-[34px] !text-sm !text-nowrap !text-white border-none"
                style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
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
                新規追加
              </Button>
            )}
        </div>
      </div>
      <div className="w-full p-5 bg-[#F8FAFC] rounded-[30px]">
        <Table className="bg-white !rounded-[10px] relative">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="w-[500px] max-w-[500px] text-left border-r-[1px] border-r-[#D2DBE1]">
              <span className="text-[#77858F] text-[12px] font-medium">
                タグ名
              </span>
            </th>
            <th className="w-[calc(100%_-_600px)] text-left">
              <span className="text-[#77858F] text-[12px] font-medium">
                表示するチーム
              </span>
            </th>
            <th className="w-[100px] max-w-[100px]"></th>
          </TableHeader>
          <TableBody>
            {dataTags && dataTags.length ? (
              dataTags.map((element, index) => (
                <tr key={index}>
                  <td className="w-[500px] text-black max-w-[500px] border-r-[1px] border-r-[#D2DBE1]">
                    <div className="flex justify-between items-center">
                      <p className="text-left max-w-[350px] truncate text-[16px] font-medium">
                        {element.name}
                      </p>
                      <div className="flex gap-2 justify-end">
                        {element.actions?.update ? (
                          <div
                            onClick={() => {
                              setSelectedTagToUpdate(Number(element.id));
                            }}>
                            <ImageRound
                              name="Edit"
                              src={'/icons/edit-gray.svg'}
                              className={`w-3 h-3 hover:cursor-pointer ${selectedTagToUpdate != element.id && 'opacity-30'}`}
                            />
                          </div>
                        ) : (
                          <div className="w-3"></div>
                        )}
                        {element.actions?.update ? (
                          <div
                            className="hidden"
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
                        {element.actions?.delete ? (
                          <ImageRound
                            name="Delete"
                            src={'/icons/delete-gray.svg'}
                            className="w-[12px] h-[14px] hover:cursor-pointer"
                            onClick={() => handleOpenDeleteTagModal(element)}
                          />
                        ) : (
                          <div className="w-[12px]"></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="!w-[calc(100%_-_600px)] text-black !break-all text-left text-[14px] font-medium">
                    {element?.organizations &&
                      element?.organizations
                        .map((org: Organizations) => org.name)
                        .join('/ ')}
                  </td>
                  <td className="w-[100px] max-w-[100px]">
                    <div className="flex justify-end px-3">
                      {element.isCalendarOrganizationCheck && (
                        <ImageRound
                          className={`w-4 h-4 hover:cursor-pointer`}
                          name="Calendar icon"
                          src="/icons/calendar-time.svg"
                        />
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

      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        name={selectedTagToDelete?.name || ''}
        type="タグ"
        message="紐づいているタスクからも削除されます。"
        onConfirm={handleConfirmDeleteTag}
        onClose={() => {
          setSelectedTagToDelete(null);
          setOpenConfirmDeleteModal(false);
        }}
      />

      {openActionsTagModal && actionTypeParam && (
        <ActionsTagModal
          open={true}
          action={actionTypeParam}
          dataTag={dataTagEdit}
          dataOrganizationList={dataOrganizationList}
          onClose={() => {
            setOpenActionsTagModal(false);
            handleRemoveParam();
            setDataTagEdit(null);
            setSelectedTagToUpdate(null);
          }}
          onCreate={(data) => {
            handleConfirmCreateTag(data);
          }}
          onEdit={(data) => {
            handleConfirmEditTag(data);
          }}
          onDelete={(data) => {
            setSelectedTagToUpdate(null);
            handleOpenDeleteTagModal(data);
            setDataTagEdit(null);
            setOpenActionsTagModal(false);
            handleRemoveParam();
          }}
        />
      )}
    </Fragment>
  );
};

export default ListTags;
