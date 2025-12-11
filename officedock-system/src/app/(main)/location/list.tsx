'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Checkbox from '@components/common/Checkbox';
import Button from '@components/common/Button';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Pagination from '@components/common/Pagination';
import Dropdown from '@components/common/Dropdown';

import { apiRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_DUPLICATE_LOCATION,
  ERROR_LONG_FIELD_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';

import useEventLocationList from '@hooks/useEventLocationList';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { LocationEventType } from '@interfaces/location';
import api from '@base/api';

const ListLocation = () => {
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);

  const [dataLocation, setDataLocation] = useState<LocationEventType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showHolidaysInCalendar, setShowHolidaysInCalendar] =
    useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [selectedLocationToDelete, setSelectedLocationToDelete] =
    useState<LocationEventType | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    page: 1,
  });

  useCreationDataCommon({
    options: {
      get_company: true,
    },
    onSuccess: (data) => {
      setShowHolidaysInCalendar(data.company?.isShowHolidaysCalendar || false);
    },
  });

  const { refetchEventLocationList } = useEventLocationList({
    pagination: {
      page: debouncedParams.page,
      pageSize,
    },
    onSuccess: (data) => {
      setDataLocation(data.results);
      setTotalPages(data.numPages);
    },
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  // Create location API
  const handleCreateEventLocation = async (data: {
    uuid: string;
    name: string;
  }) => {
    setIsLoading(true);
    return await api.post(apiRouters.LOCATION_LIST, data);
  };

  const { mutate: createEventLocation } = useMutation(
    'postCreateEventLocation',
    handleCreateEventLocation,
    {
      onSuccess: () => {
        refetchEventLocationList();
        setEditingId(null);
        setEditText('');
        setIsCreating(false);
        setIsEditing(false);

        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_CREATE_MESSAGE,
        });
      },
    },
  );

  // Edit location API
  const handleEditEventLocation = async (data: {
    uuid: string;
    name: string;
  }) => {
    return await api.put(apiRouters.LOCATION_DETAIL(data.uuid), data);
  };

  const { mutate: editEventLocation } = useMutation(
    'postEditEventLocation',
    handleEditEventLocation,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      },
    },
  );

  // Delete location API
  const handleDeleteEventLocation = async (uuid: string) => {
    setIsLoading(true);
    return await api.delete(apiRouters.LOCATION_DETAIL(uuid));
  };

  const { mutate: deleteEventLocation } = useMutation(
    'postDeleteEventLocation',
    handleDeleteEventLocation,
    {
      onSuccess: () => {
        setDataLocation((prev) =>
          prev.filter((item) => item.uuid !== selectedLocationToDelete?.uuid),
        );
        if (dataLocation?.length === 1 && debouncedParams.page > 1) {
          // If change current page, useLocationList auto recall, just don't need using refetchLocationList
          setDebouncedParams((prev) => ({
            ...prev,
            page: debouncedParams.page - 1,
          }));
        } else {
          refetchEventLocationList();
        }
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        setOpenConfirmDeleteModal(false);
        setIsCreating(false);
        setIsEditing(false);

        setSelectedLocationToDelete(null);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_DELETE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsCreating(false);
        setIsEditing(false);
        setIsLoading(false);
      },
    },
  );

  // Handle Create
  const handleCreate = () => {
    if (isCreating) return;
    const newId = uuidv4();
    ('');
    const newItem: LocationEventType = { uuid: newId, name: '' };
    setDataLocation((prevItems) => [newItem, ...prevItems]);
    setEditingId(newId);
    setEditText('');
    setIsCreating(true);
  };

  // Handle blur Input
  const handleBlur = (uuid: string) => {
    const trimmedText = editText.trim();
    if (trimmedText === '') {
      setErrors((prev) => ({ ...prev, [uuid]: true }));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    if (trimmedText.length > 255) {
      if (isCreating) {
        showToast({
          variant: 'error',
          description: ERROR_LONG_FIELD_MESSAGE,
        });
      } else {
        showToast({
          variant: 'error',
          description: ERROR_LONG_FIELD_MESSAGE,
        });
      }
      setErrors((prev) => ({ ...prev, [uuid]: true }));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    // Check for duplicate names, skip the item being edited
    const isDuplicate = dataLocation.some(
      (item) => item.uuid !== uuid && item.name === trimmedText,
    );

    if (isDuplicate) {
      showToast({
        variant: 'error',
        description: ERROR_DUPLICATE_LOCATION,
      });
      setErrors((prev) => ({ ...prev, [uuid]: true }));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    setDataLocation((prevItems) =>
      prevItems.map((item) =>
        item.uuid === uuid ? { ...item, name: editText } : item,
      ),
    );
    if (isCreating) {
      createEventLocation({
        name: editText,
        uuid: editingId || '',
      });
    } else {
      const originalItem = dataLocation.find((item) => item.uuid === uuid);
      if (originalItem && originalItem.name !== trimmedText) {
        editEventLocation({
          name: editText,
          uuid: editingId || '',
        });
      }
    }
    setEditingId(null);
    setEditText('');
    setIsCreating(false);
    setIsEditing(false);

    setErrors((prev) => ({ ...prev, [uuid]: false }));
  };

  // Handle click edit item
  const handleEditClick = (uuid: string, currentText: string) => {
    if (isCreating || isEditing) return;
    setEditingId(uuid);
    setEditText(currentText);
    setIsCreating(false);
  };

  // Handle confirm delete
  const handleConfirmDeleteLocation = () => {
    deleteEventLocation(selectedLocationToDelete?.uuid || '');
  };

  // Change setting holidays in calendar
  const handleChangeHolidaysSettingInCalendar = async (
    isShowHolidaysCalendar: boolean,
  ) => {
    setIsLoading(true);
    const { data: response } = await api.post(apiRouters.COMPANY_SETTINGS, {
      isShowHolidaysCalendar,
    });
    return response;
  };

  const { mutate: changeHolidaysSettingInCalendar } = useMutation(
    handleChangeHolidaysSettingInCalendar,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: () => {
        showToast({
          description: ERROR_UPDATE_MESSAGE,
          variant: 'error',
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center pb-[30px]">
        <p className="text-[26px] font-medium leading-[1]">カレンダー設定</p>
        <div>
          <Checkbox
            label="カレンダーに祝日を表示"
            classLabel="text-sm font-medium text-black relative top-[3px]"
            isChecked={showHolidaysInCalendar}
            onChange={(state: boolean) => {
              changeHolidaysSettingInCalendar(state);
            }}
          />
        </div>
      </div>
      <div
        className="w-full p-[30px] bg-[#F8FAFC] rounded-[30px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#77858F] font-medium text-sm pl-1">
            予定場所登録
          </p>
          <Button
            className="w-[100px] h-[34px] !text-sm !text-nowrap !text-white border-none"
            style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
            onClick={handleCreate}>
            <ImageRound
              src="/icons/add-with-background.svg"
              name="Add icon"
              className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
            />
            新規追加
          </Button>
        </div>

        <Table className="bg-white !rounded-[10px] relative table-fixed">
          <TableHeader className="!bg-[#F8FAFC]">
            <th className="text-left w-[calc(100%_-_50px)]">
              <span className="text-[#77858F] text-[12px] font-medium">
                場所名
              </span>
            </th>
            <th className="text-left w-[50px] min-w-[50px]"></th>
          </TableHeader>
          <TableBody>
            {dataLocation.length > 0 ? (
              dataLocation.map((item, index) => (
                <tr key={index} className="text-black">
                  <td className="text-left w-[calc(100%_-_50px)] max-w-[calc(100%_-_50px)] !px-0">
                    <div className="flex justify-between items-center gap-3 ">
                      {editingId === item.uuid ? (
                        <div className="pl-[10px] w-full">
                          <input
                            ref={inputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => handleBlur(item?.uuid as string)}
                            placeholder="場所名を入力"
                            className={`w-full px-3.5 ${errors[item.uuid] && '!border-red-500'} py-2.5 leading-5.5 placeholder-gray-300  rounded-lg focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 !border-[1px] !border-[#77858F] !text-sm !h-[34px]`}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="break-all px-[18px] max-w-[100%] text-[16px] font-medium text-[#000000]">
                            {item.name}
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex w-[50px] break-words gap-2 justify-center">
                      <ImageRound
                        name="Edit"
                        src={'/icons/edit-gray.svg'}
                        className={`w-3 h-3 hover:cursor-pointer ${editingId == item.uuid ? '' : 'opacity-30'}`}
                        onClick={() => {
                          if (isEditing || isCreating) return;
                          setIsEditing(true);
                          handleEditClick(item?.uuid as string, item.name);
                        }}
                      />
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-gray.svg'}
                        className="w-[12px] h-[14px] hover:cursor-pointer"
                        onMouseDown={(e) => {
                          if (isCreating) {
                            e.preventDefault();
                          }
                        }}
                        onClick={() => {
                          if (isCreating && editingId === item.uuid) {
                            setDataLocation((prev) =>
                              prev.filter((data) => data.uuid !== item.uuid),
                            );
                            setEditingId(null);
                            setEditText('');
                            setIsCreating(false);
                            setIsEditing(false);
                            return;
                          }
                          if (
                            (isCreating && editingId !== item.uuid) ||
                            isEditing
                          )
                            return;
                          setSelectedLocationToDelete(item);
                          setOpenConfirmDeleteModal(true);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="py-5 text-center text-sm leading-6">
                <td className="h-16 !border-r-0" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataLocation && dataLocation.length ? (
              <Pagination
                disable={isEditing}
                onChange={(pageNumber) => {
                  setIsCreating(false);
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }));
                }}
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
                disabled={isEditing}
                className="h-[34px] !w-full !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                classNameTextData="!text-xs"
                classActive="!text-sm"
                classNameOption="!text-sm !border-[#77858F] !ring-[#77858F] !ring-opacity-100 !bottom-full !mb-1"
                labelOptionClass="!text-sm font-medium !pl-1.5"
                onChange={(e) => {
                  setIsCreating(false);
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
          name={selectedLocationToDelete?.name || ''}
          type="場所"
          onConfirm={handleConfirmDeleteLocation}
          onClose={() => {
            setOpenConfirmDeleteModal(false);
            setSelectedLocationToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default ListLocation;
