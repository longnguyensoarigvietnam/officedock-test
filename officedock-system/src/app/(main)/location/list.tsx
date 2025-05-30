'use client';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import Checkbox from '@components/common/Checkbox';
import Button from '@components/common/Button';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import { PermissionsSystem } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { NO_DATA_AVAILABLE } from '@constants';

import useEventLocationList from '@hooks/useEventLocationList';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { LocationEventType } from '@interfaces/location';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';

const ListLocation = () => {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);

  const [dataLocation, setDataLocation] = useState<LocationEventType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [selectedLocationToDelete, setSelectedLocationToDelete] =
    useState<LocationEventType | null>(null);

  useEventLocationList({
    onSuccess: (data) => {
      setDataLocation(data);
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
    return await api.post(apiRouters.LOCATION_LIST, data);
  };

  const { mutate: createEventLocation } = useMutation(
    'postCreateEventLocation',
    handleCreateEventLocation,
    {
      onSuccess: () => {
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
        setOpenConfirmDeleteModal(false);

        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        setSelectedLocationToDelete(null);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_DELETE_MESSAGE,
        });
      },
      onSettled: () => {
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
    if (editText.trim() === '') {
      setErrors((prev) => ({ ...prev, [uuid]: true }));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    } else {
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

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center pb-[30px]">
        <p className="text-[26px] font-medium">カレンダー設定</p>
        <div>
          <Checkbox
            label="カレンダーに祝日を表示"
            classLabel="text-sm font-medium text-black relative top-[3px]"
          />
        </div>
      </div>
      <div
        className="w-full p-5 bg-[#F8FAFC] rounded-[14px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#77858F] font-medium text-sm pl-1">
            予定場所登録
          </p>
          <Button className="w-[100px] !p-0 !h-[34px]" onClick={handleCreate}>
            <ImageRound
              src="/icons/add-with-background.svg"
              name="Add icon"
              className="!w-4 !h-4 mr-2 text-gray-400 cursor-pointer"
            />
            新規追加
          </Button>
        </div>

        <Table className="bg-white !rounded-lg relative table-fixed">
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
                            placeholder="チーム名を入力"
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
                    <div className="flex w-[50px] break-words gap-3 justify-center">
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_UPDATE,
                      ) ? (
                        <button>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit-gray.svg'}
                            className={`w-3.5 h-3.5 hover:cursor-pointer`}
                            onClick={() => {
                              setIsEditing(true);

                              handleEditClick(item?.uuid as string, item.name);
                            }}
                          />
                        </button>
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
                            if (isCreating || isEditing) return;
                            setSelectedLocationToDelete(item);
                            setOpenConfirmDeleteModal(true);
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
                <td className="h-16 !border-r-0" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
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
