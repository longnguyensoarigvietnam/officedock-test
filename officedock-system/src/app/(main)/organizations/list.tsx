'use client';
import {
  ChangeEvent,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import ErrorUploadFileValidationModal from '@components/modals/ErrorUploadFileValidationModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';
import InputSearch from '@components/common/InputSearch';

import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_IMAGE_FILE_SIZE,
  NO_DATA_AVAILABLE,
  PAGE_SIZE_OPTIONS,
} from '@constants';
import { apiRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_AVATAR_FILE_MAXIMUM_SIZE,
} from '@constants/message';
import { ActionsModal, PermissionsSystem } from '@constants/enums';

import { Organizations } from '@interfaces/organization';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { hasPermissionInArray } from '@utils';

import useOrganizationList from '@hooks/useOrganizationList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';

import api from '@base/api';

const ListOrganizations = () => {
  const { data: session } = useSessionCache();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const [selectedOrganizationToUpdate, setSelectedOrganizationToUpdate] =
    useState<{
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
  const [selectedOrganizationToDelete, setSelectedOrganizationToDelete] =
    useState<Organizations | null>(null);
  const organizationNameInputRef = useRef<HTMLInputElement | null>(null);
  const isCreatingRef = useRef(false);
  const isEditingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { showToast } = useToast();

  const [dataOrganizations, setDataOrganizations] = useState<Organizations[]>(
    [],
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [openErrorUploadFileModal, setOpenErrorUploadFileModal] =
    useState(false);
  const [searchOrganizationName, setSearchOrganizationName] = useState('');
  const debouncedFilterByOrganizationName = useDebounceText(
    searchOrganizationName,
    1000,
  );
  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    page: 1,
  });
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [avatarImgFile, setAvatarImgFile] = useState<File | null>(null);

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedFilterByOrganizationName,
      page: 1,
    }));
  }, [debouncedFilterByOrganizationName]);

  const { organizationList, refetchOrganizationList } = useOrganizationList(
    { page: debouncedParams.page, pageSize },
    { name: debouncedParams.search },
  );

  useEffect(() => {
    if (organizationList) {
      setDataOrganizations(organizationList.results);
      setTotalPages(organizationList.numPages);
    }
  }, [organizationList]);

  // Edit organization name
  const handleEditOrganization = async (data: {
    uuid: string | number;
    name: string;
    avatarImgFile?: File | null;
  }) => {
    const formData = new FormData();
    formData.append('uuid', String(data.uuid));
    formData.append('name', data.name);
    if (data.avatarImgFile) formData.append('icon', data.avatarImgFile);

    return await api.patch(
      apiRouters.ORGANIZATION_DETAIL(String(data.uuid)),
      formData,
    );
  };

  const { mutate: editOrganization } = useMutation(
    'postEditOrganization',
    handleEditOrganization,
    {
      onMutate: () => {
        isEditingRef.current = true;
      },
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setSelectedOrganizationToUpdate({
          uuid: '',
          name: '',
          status: false,
          action: '',
          showError: false,
        });
        setPreviewAvatarUrl(null);
        setAvatarImgFile(null);
        refetchOrganizationList();
        isEditingRef.current = false;
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
        setSelectedOrganizationToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
        isEditingRef.current = false;
      },
    },
  );

  // Create organization
  const handleCreateOrganization = async (data: {
    uuid: string;
    name: string;
    avatarImgFile?: File | null;
  }) => {
    const formData = new FormData();
    formData.append('uuid', String(data.uuid));
    formData.append('name', data.name);
    if (data.avatarImgFile) formData.append('icon', data.avatarImgFile);

    return await api.post(apiRouters.ORGANIZATION_LIST, formData);
  };

  const { mutate: createOrganization } = useMutation(
    'postCreateOrganization',
    handleCreateOrganization,
    {
      onMutate: () => {
        isCreatingRef.current = true;
      },
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setSelectedOrganizationToUpdate({
          uuid: '',
          name: '',
          status: false,
          action: '',
          showError: false,
        });
        refetchOrganizationList();
        setPreviewAvatarUrl(null);
        setAvatarImgFile(null);
        isCreatingRef.current = false;
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        setSelectedOrganizationToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
        isCreatingRef.current = false;
      },
    },
  );

  // Delete organization
  const handleOpenDeleteOrganizationModal = (organization: Organizations) => {
    setOpenConfirmDeleteModal(true);
    setSelectedOrganizationToDelete(organization);
  };

  const handleConfirmDeleteOrganization = () => {
    if (selectedOrganizationToDelete) {
      setIsLoading(true);
      deleteOrganization(String(selectedOrganizationToDelete.uuid));
      return;
    }
  };

  const postDeleteOrganization = async (uuid: string) => {
    const { data: response } = await api.delete(
      apiRouters.ORGANIZATION_DETAIL(`${uuid}`),
    );
    return response;
  };

  const { mutate: deleteOrganization } = useMutation(postDeleteOrganization, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      if (organizationList?.results.length === 1 && debouncedParams.page > 1) {
        // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchOrganizationList();
      }
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setOpenConfirmDeleteModal(false);
      setIsLoading(false);
    },
    onSettled: () => {
      setSelectedOrganizationToDelete(null);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        organizationNameInputRef.current &&
        !organizationNameInputRef.current.contains(event.target) &&
        !event.target.closest('.toast-container') &&
        !event.target.closest('.delete-icon') &&
        !event.target.closest('.edit-icon')
      ) {
        if (selectedOrganizationToUpdate.action == ActionsModal.EDIT) {
          if (isEditingRef.current) return;
          const oldCategoryName =
            dataOrganizations.find(
              (category) => category.uuid == selectedOrganizationToUpdate.uuid,
            )?.name || '';
          if (
            oldCategoryName.trim() !=
              selectedOrganizationToUpdate.name.trim() ||
            avatarImgFile
          ) {
            editOrganization({
              uuid: selectedOrganizationToUpdate.uuid,
              name: selectedOrganizationToUpdate.name,
              avatarImgFile: avatarImgFile ? avatarImgFile : undefined,
            });
          } else {
            setSelectedOrganizationToUpdate({
              uuid: '',
              name: '',
              status: false,
              action: '',
              showError: false,
            });
          }
        } else {
          if (isCreatingRef.current) return;
          if (selectedOrganizationToUpdate.name.trim()) {
            createOrganization({
              uuid: String(selectedOrganizationToUpdate.uuid),
              name: selectedOrganizationToUpdate.name,
              avatarImgFile: avatarImgFile ? avatarImgFile : undefined,
            });
          } else {
            setSelectedOrganizationToUpdate((prev) => {
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
    selectedOrganizationToUpdate.uuid,
    selectedOrganizationToUpdate.name,
    selectedOrganizationToUpdate.action,
    avatarImgFile,
  ]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      e.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_IMAGE_FILE_SIZE) {
      setOpenErrorUploadFileModal(true);
      return;
    }

    const newFile = new File([file], file.name, {
      type: file.type,
    });

    setAvatarImgFile(newFile);

    const url = URL.createObjectURL(newFile);
    setPreviewAvatarUrl(url);
  };

  return (
    <Fragment>
      <div className="flex justify-between">
        <InputSearch
          placeholder="チームを検索"
          inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none placeholder-[#77858F99]"
          iconClassName="w-[14px] h-[14px]"
          onChange={(e) => {
            setSearchOrganizationName(e.target.value);
          }}
        />
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.ORGANIZATION_ADD,
          ) && (
            <Button
              className="w-[100px] !p-0 !border-none "
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              onClick={() => {
                const hasEmptyOrganization = dataOrganizations.some(
                  (org) => org.name.trim() === '',
                );

                if (!hasEmptyOrganization) {
                  const newUuid = uuidv4();
                  setDataOrganizations((prev) => [
                    {
                      uuid: newUuid,
                      name: '',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                    ...prev,
                  ]);
                  setSelectedOrganizationToUpdate({
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
        <Table className="bg-white !rounded-[10px] relative table-fixed">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="text-left w-[calc(100%_-_40px)]">
              <span className="text-[#77858F] text-[12px] font-medium">
                チーム名
              </span>
            </th>
            <th className="text-left w-[40px] min-w-[40px]"></th>
          </TableHeader>
          <TableBody>
            {dataOrganizations && dataOrganizations.length ? (
              dataOrganizations.map((element, index) => (
                <tr key={index} className="text-black">
                  <td
                    className={`text-left w-[calc(100%_-_40px)] max-w-[calc(100%_-_40px)] !px-[18px] ${
                      selectedOrganizationToUpdate.uuid == element.uuid &&
                      selectedOrganizationToUpdate.status
                        ? '!py-[5px]'
                        : '!py-[13px]'
                    }`}>
                    {selectedOrganizationToUpdate.uuid == element.uuid &&
                    selectedOrganizationToUpdate.status ? (
                      <div
                        ref={organizationNameInputRef}
                        className="flex items-center gap-[6px]">
                        <div className="relative w-10 h-10 inline-block hover:cursor-pointer ml-[-8px]">
                          <div className="relative">
                            {previewAvatarUrl ? (
                              <CustomUserAvatar
                                avatarUrl={previewAvatarUrl || ''}
                                avatarColor={''}
                                size={40}
                              />
                            ) : (
                              <div className="relative">
                                <GroupIconWithDynamicColor
                                  color={element.iconColor || '#228CDB'}
                                  classname="z-10"
                                  size={40}
                                />
                              </div>
                            )}
                            <p
                              className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold z-30"
                              onClick={() => {
                                fileInputRef.current?.click();
                              }}>
                              変更
                            </p>
                          </div>

                          <input
                            type="file"
                            accept={ALLOWED_IMAGE_TYPES.join(',')}
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              handleFileChange(e);
                            }}
                          />
                          <div
                            className={`absolute top-0 left-0 w-10 h-10 ${previewAvatarUrl ? 'bg-black/30' : 'bg-black/50'} rounded-full z-20 pointer-events-none`}
                          />
                        </div>
                        <div className="w-[calc(100%_-_30px)]">
                          <Input
                            placeholder="チーム名を入力"
                            className={`!border-[1px] !border-[#77858F] ${selectedOrganizationToUpdate.showError && '!border-error'} !w-full !text-sm !h-[34px]`}
                            defaultValue={element.name}
                            onChange={(e) => {
                              setSelectedOrganizationToUpdate((prev) => {
                                return {
                                  ...prev,
                                  name: e.target.value,
                                };
                              });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-[6px]">
                        {element.icon ? (
                          <CustomUserAvatar
                            avatarUrl={element.icon || ''}
                            avatarColor={''}
                            size={24}
                          />
                        ) : (
                          <GroupIconWithDynamicColor
                            color={element.iconColor || '#228CDB'}
                            size={24}
                          />
                        )}{' '}
                        <p className="break-all w-[calc(100%_-_50px)] text-[16px] font-medium text-[#000000] leading-none">
                          {element.name}
                        </p>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex w-[40px] break-words gap-2 justify-center">
                      {session?.user.permissions &&
                      !(
                        selectedOrganizationToUpdate.action ==
                          ActionsModal.CREATE &&
                        selectedOrganizationToUpdate.uuid == element.uuid
                      ) &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_UPDATE,
                      ) ? (
                        <button>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit-gray.svg'}
                            className={`w-3 h-3 edit-icon ${
                              selectedOrganizationToUpdate.uuid !=
                                element.uuid &&
                              selectedOrganizationToUpdate.status
                                ? 'hover:cursor-not-allowed'
                                : 'hover:cursor-pointer'
                            } ${!(selectedOrganizationToUpdate.uuid == element.uuid) && 'opacity-30'}`}
                            onClick={() => {
                              if (
                                selectedOrganizationToUpdate.uuid !=
                                  element.uuid &&
                                selectedOrganizationToUpdate.status
                              )
                                return;
                              if (
                                selectedOrganizationToUpdate.uuid !=
                                element.uuid
                              ) {
                                setDataOrganizations((prev) => {
                                  let updatedCategories = [...prev];
                                  updatedCategories = updatedCategories.filter(
                                    (category) =>
                                      category.uuid !=
                                      selectedOrganizationToUpdate.uuid,
                                  );
                                  return updatedCategories;
                                });
                              }
                              setPreviewAvatarUrl(element.icon || null);
                              setSelectedOrganizationToUpdate({
                                uuid: element.uuid || '',
                                name: element.name,
                                status: true,
                                action: ActionsModal.EDIT,
                                showError: false,
                              });
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-3"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-gray.svg'}
                          className={`w-[12px] h-[14px] delete-icon ${
                            selectedOrganizationToUpdate.uuid != element.uuid &&
                            selectedOrganizationToUpdate.status
                              ? 'hover:cursor-not-allowed'
                              : 'hover:cursor-pointer'
                          }`}
                          onClick={() => {
                            if (
                              selectedOrganizationToUpdate.uuid !=
                                element.uuid &&
                              selectedOrganizationToUpdate.status
                            )
                              return;
                            if (
                              selectedOrganizationToUpdate.status &&
                              selectedOrganizationToUpdate.action ==
                                ActionsModal.CREATE
                            ) {
                              setDataOrganizations((prev) => {
                                let updatedOrganizations = [...prev];
                                updatedOrganizations =
                                  updatedOrganizations.filter(
                                    (org) => org.uuid != element.uuid,
                                  );
                                return updatedOrganizations;
                              });
                            } else {
                              handleOpenDeleteOrganizationModal(element);
                            }
                            setSelectedOrganizationToUpdate({
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
            {dataOrganizations && dataOrganizations.length ? (
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
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          name={selectedOrganizationToDelete?.name || ''}
          type="チーム"
          message="紐づいている階層からも削除されます。"
          onConfirm={handleConfirmDeleteOrganization}
          onClose={() => setOpenConfirmDeleteModal(false)}
        />
      )}

      {openErrorUploadFileModal && (
        <ErrorUploadFileValidationModal
          open={true}
          message={UPLOAD_AVATAR_FILE_MAXIMUM_SIZE}
          onClose={() => {
            setOpenErrorUploadFileModal(false);
          }}
        />
      )}
    </Fragment>
  );
};

export default ListOrganizations;
