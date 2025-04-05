'use client';
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';
import InputSearch from '@components/common/InputSearch';

import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import { apiRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
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
  const { data: session } = useSession();

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

  const { showToast } = useToast();

  const [dataOrganizations, setDataOrganizations] = useState<Organizations[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [searchOrganizationName, setSearchOrganizationName] = useState('');
  const debouncedFilterByOrganizationName = useDebounceText(
    searchOrganizationName,
    1000,
  );

  const { organizationList, refetchOrganizationList } = useOrganizationList(
    { page: currentPage, pageSize },
    { name: debouncedFilterByOrganizationName },
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
  }) => {
    return await api.patch(apiRouters.ORGANIZATION_DETAIL(String(data.uuid)), {
      name: data.name,
    });
  };

  const { mutate: editOrganization } = useMutation(
    'postEditOrganization',
    handleEditOrganization,
    {
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
        refetchOrganizationList();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
        setSelectedOrganizationToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
      },
    },
  );

  // Create organization
  const handleCreateOrganization = async (data: {
    uuid: string;
    name: string;
  }) => {
    return await api.post(apiRouters.ORGANIZATION_LIST, data);
  };

  const { mutate: createOrganization } = useMutation(
    'postCreateOrganization',
    handleCreateOrganization,
    {
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
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        setSelectedOrganizationToUpdate((prev) => {
          return {
            ...prev,
            showError: true,
          };
        });
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
      if (organizationList?.results.length === 1 && currentPage > 1) {
        // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
        setCurrentPage(currentPage - 1);
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
        !organizationNameInputRef.current.contains(event.target)
      ) {
        if (selectedOrganizationToUpdate.action == ActionsModal.EDIT) {
          const oldCategoryName =
            dataOrganizations.find(
              (category) => category.uuid == selectedOrganizationToUpdate.uuid,
            )?.name || '';
          if (
            oldCategoryName.trim() != selectedOrganizationToUpdate.name.trim()
          ) {
            editOrganization({
              uuid: selectedOrganizationToUpdate.uuid,
              name: selectedOrganizationToUpdate.name,
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
          if (selectedOrganizationToUpdate.name.trim()) {
            createOrganization({
              uuid: String(selectedOrganizationToUpdate.uuid),
              name: selectedOrganizationToUpdate.name,
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
  ]);
  const [isCreate, setIsCreate] = useState(false);

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
              className="w-[100px] !p-0"
              onClick={() => {
                const hasEmptyOrganization = dataOrganizations.some(
                  (org) => org.name.trim() === '',
                );
                setIsCreate(true);

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
      <div className="w-full p-5 bg-[#F8FAFC] rounded-[14px]">
        <Table className="bg-white !rounded-lg relative table-fixed">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="text-left w-[calc(100%_-_50px)]">
              <span className="text-[#77858F] text-[12px] font-medium">
                チーム名
              </span>
            </th>
            <th className="text-left w-[50px] min-w-[50px]"></th>
          </TableHeader>
          <TableBody>
            {dataOrganizations && dataOrganizations.length ? (
              dataOrganizations.map((element, index) => (
                <tr key={index} className="text-black">
                  <td className="text-left w-[calc(100%_-_50px)] max-w-[calc(100%_-_50px)]">
                    <div className="flex justify-between items-center gap-3 ">
                      {selectedOrganizationToUpdate.uuid == element.uuid &&
                      selectedOrganizationToUpdate.status ? (
                        <div ref={organizationNameInputRef} className="w-full">
                          <Input
                            placeholder="チーム名を入力"
                            className={`!border-[1px] !border-[#77858F] ${selectedOrganizationToUpdate.showError && '!border-error'} !w-full !text-sm !h-[34px]`}
                            defaultValue={element.name}
                            onBlur={() => {
                              setIsCreate(false);
                            }}
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
                      ) : (
                        <p
                          className="break-all max-w-[100%] text-[16px] font-medium text-[#000000]">
                          {element.name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex w-[50px] break-words gap-3 justify-center">
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_UPDATE,
                      ) ? (
                        <div>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit-gray.svg'}
                            className={`w-3.5 h-3.5 hover:cursor-pointer ${isCreate && ' opacity-45'} ${!(selectedOrganizationToUpdate.uuid == element.uuid) && 'opacity-45'}`}
                            onClick={() => {
                              if (isCreate) return;

                              setSelectedOrganizationToUpdate({
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
                        <div className="w-3.5"></div>
                      )}
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_DELETE,
                      ) ? (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-gray.svg'}
                          className="w-[13px] h-[15px] hover:cursor-pointer"
                          onClick={() => {
                            if (
                              selectedOrganizationToUpdate.uuid ==
                                element.uuid &&
                              selectedOrganizationToUpdate.status &&
                              selectedOrganizationToUpdate.action ==
                                ActionsModal.CREATE
                            ) {
                              setDataOrganizations((prev) => {
                                let updatedCategories = [...prev];
                                updatedCategories = updatedCategories.filter(
                                  (category) => category.uuid != element.uuid,
                                );
                                return updatedCategories;
                              });
                              setSelectedOrganizationToUpdate({
                                uuid: '',
                                name: '',
                                status: false,
                                action: '',
                                showError: false,
                              });
                            } else {
                              handleOpenDeleteOrganizationModal(element);
                            }
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
      </div>
      <div className="flex justify-center items-center w-full">
        <div className="flex justify-center flex-1">
          {dataOrganizations && dataOrganizations.length ? (
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
              labelOptionClass="!text-sm font-medium !pl-1.5"
              onChange={(e) => {
                setPageSize(Number(e.value));
                setCurrentPage(1);
              }}
            />
          </div>
          <p className="text-sm">件ずつ表示</p>
        </div>
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        name={selectedOrganizationToDelete?.name || ''}
        type="チーム"
        message="紐づいている階層からも削除されます。"
        onConfirm={handleConfirmDeleteOrganization}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </Fragment>
  );
};

export default ListOrganizations;
