'use client';
import React, { useContext, useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import TableDropdown from '@components/common/Dropdown/TableDropdown';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';
import { CurrentScreen, ServerStatusCode } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import { SkillMapFormData } from '@interfaces/skills';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { SkillMapStateContext } from '@providers/SkillMapProvider';

import useSkillMapDetail from '@hooks/useSkillMapDetail';
import useOrganizationSkillDetail from '@hooks/useOrganizationSkillDetail';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

interface rowDataType {
  id?: number | null;
  customId: string;
  skillId: number | string;
  level: string;
  index: number;
  isApplying: boolean;
  isSubmitted: boolean;
  isShow: boolean;
}
const EditSkillMapForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const [isSubmit, setIsSubmit] = useState(false);

  const { showToast } = useToast();
  const [dataOptionsSkill, setDataOptionsSkill] = useState<
    OptionDropdownType[]
  >([]);

  const [rows, setRows] = useState<rowDataType[]>([]);
  const { dataSkillMapDetail, setDataSkillMapDetail } =
    useContext(SkillMapStateContext);
  const { organizationSkillDetail } = useOrganizationSkillDetail({
    current_screen: CurrentScreen.SKILL_MAP,
    organizationId: `${searchParams.get('organizationId')}`,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ORGANIZATION_SKILLS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useSkillMapDetail({
    organizationId: `${searchParams.get('organizationId')}`,
    staffId: `${searchParams.get('staffId')}`,
    conditions: [!dataSkillMapDetail],
    onSuccess: (data) => {
      setIsLoading(false);
      const sortedRows = data.skillMaps
        .map((org) => ({
          id: org.id,
          level: org.level,
          skillId: org.skill ? org.skill.id : '',
          isApplying: org.isApplying || false,
          isSubmitted: org.isSubmitted || false,
          index: org.index,
          customId: uuidv4(),
          isShow: org.skillLevels == null ? false : true,
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
      setDataSkillMapDetail(data);
    },
    onError: (error: AxiosError) => {
      setIsLoading(false);
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.SKILL_MAPS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (!dataSkillMapDetail) {
      setIsLoading(true);
    } else {
      const sortedRows = dataSkillMapDetail.skillMaps
        .map((org) => ({
          id: org.id,
          level: org.level,
          skillId: org.skill ? org.skill.id : '',
          isApplying: org.isApplying || false,
          isSubmitted: org.isSubmitted || false,
          index: org.index,
          customId: uuidv4(),
          isShow: org.skillLevels == null ? false : true,
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSkillMapDetail]);

  useEffect(() => {
    if (organizationSkillDetail) {
      const skillOptions = organizationSkillDetail?.map((org) => ({
        label: org.skill?.name || '',
        value: String(org.skill?.id),
      }));
      setDataOptionsSkill(skillOptions);
    }
  }, [organizationSkillDetail]);

  const handleEditCategoryLine = (
    customId: string,
    field: string,
    value: string,
  ) => {
    const newRows = rows.map((row) => {
      if (row.customId === customId) {
        const newRow = { ...row, [field]: value, isShow: true };
        return newRow;
      }

      return row;
    });

    setRows(newRows);
  };

  //  Handle call api edit / create line
  const handleActionCategoryInline = async (dataSkillMap: SkillMapFormData) => {
    setIsLoading(true);
    const { data } = await api.post(apiRouters.SKILL_MAPS_LIST, dataSkillMap);
    return data;
  };
  const { mutate: actionCategoryInline } = useMutation(
    'postActionCategoryInline',
    handleActionCategoryInline,
    {
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.SKILL_MAPS_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsSubmit(false);
        setIsLoading(false);
      },
    },
  );

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.index === destination.index) return;

    const updatedRows = [...rows];

    const [reorderedItem] = updatedRows.splice(source.index, 1);
    updatedRows.splice(destination.index, 0, reorderedItem);

    const reorderedRows = updatedRows.map((row, idx) => ({
      ...row,
      index: idx + 1,
    }));

    setRows(reorderedRows);
  };

  // Handle delete line
  const handleDeleteRow = (customId: string) => {
    const updatedRows = [...rows];
    const rowIndex = updatedRows.findIndex((row) => row.customId == customId);
    if (rowIndex != -1) {
      updatedRows[rowIndex].isShow = false;
      updatedRows[rowIndex].skillId = '';
    }
    setRows(updatedRows);
  };

  const handleSubmitSkillMaps = () => {
    if (
      rows.every(
        (item) =>
          item.isShow == false || (item.isShow == true && item.skillId == ''),
      )
    ) {
      showToast({
        variant: 'error',
        description: ERROR_SAVE_MESSAGE,
      });
    } else {
      if (isSubmit) return;
      setIsSubmit(true);
      actionCategoryInline({
        skillMaps: rows
          .filter((row) => !(row.isShow == false && row.id == null))
          .map((row) => {
            return {
              skillMapId: row.id || null,
              level: row.level || null,
              skillId: !row.isShow ? null : row.skillId || null,
              index: row.index,
            };
          }),
        staffId: Number(searchParams.get('staffId')),
        organizationId: Number(searchParams.get('organizationId')),
      });
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center mb-3">
          <ImageRound
            className="w-24 h-24"
            src="/images/avatar-default.svg"
            border="full"
            name="Avatar user"
          />
          <div className="ml-5">
            <div className="flex gap-3 items-center">
              <p className="font-normal text-2xl mb-2 truncate max-w-[300px]">
                {dataSkillMapDetail?.staff.fullName}
              </p>
              <ImageRound
                className="w-9 h-9"
                src="/icons/pajamas-smile.svg"
                border="full"
                name="Pajamas smile"
              />
            </div>
            <div className="flex gap-5 font-normal text-lg">
              <p className="truncate max-w-[500px]">
                {`${dataSkillMapDetail?.organization?.name || ''}`}
              </p>
              <div>
                {dataSkillMapDetail?.staff.roles &&
                  dataSkillMapDetail?.staff.roles.map((role, index) => {
                    return (
                      <span key={index}>
                        {role.name}
                        {index != dataSkillMapDetail?.staff.roles.length - 1 &&
                          ','}
                      </span>
                    );
                  })}
              </div>{' '}
            </div>
          </div>
          <div className="ml-64">
            <p className="font-normal text-lg mb-2 ">レベルの説明</p>
            <p className="font-normal text-lg mb-2 ">ポイントの付与の説明</p>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="w-[70%] min-w-[70%] divide-y divide-gray-200 ring-1 ring-gray-200 rounded-2xl">
            <div className="flex bg-[#F3F4F6] py-1 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200 mx-[1px] ">
              <div className="flex-grow text-center w-[calc((100%_-_48px)/2)] flex items-center justify-center">
                スキル
              </div>
              <div className="flex-grow text-center w-[calc((100%_-_48px)/2)] flex items-center justify-center">
                レベル
              </div>
              <div className="flex-grow text-center w-12 flex items-center justify-center"></div>
            </div>

            <Droppable droppableId="divRows" direction="vertical">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-white max-h-[calc(100vh_-_500px)] overflow-y-auto">
                  {rows
                    .filter((row) => row.isShow == true)
                    .map((row, index) => {
                      return (
                        <Draggable
                          key={row.customId}
                          draggableId={row.customId}
                          index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex relative bg-white">
                              <div className="flex items-center justify-center absolute overflow-x-hidden left-2 z-10 top-1/2 -translate-y-1/2">
                                <ImageRound
                                  {...provided.dragHandleProps}
                                  className="w-[12px] h-[20px] cursor-grab hover:cursor-pointer"
                                  src="/icons/drag.svg"
                                  name="drag item"
                                />
                              </div>
                              <div className="w-[calc((100%_-_48px)/2)] max-w-[calc((100%_-_48px)/2)] border-r-[1px]">
                                {row.isSubmitted ? (
                                  <div className={`py-2 border-[1px]`}>
                                    <p className="pl-7 truncate max-w-[98%]">
                                      {
                                        dataOptionsSkill.find(
                                          (element) =>
                                            String(element.value) ===
                                            String(row.skillId),
                                        )?.label
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  <div className='w-full'>
                                    <TableDropdown
                                      selectedOption={dataOptionsSkill.find(
                                        (element) =>
                                          String(element.value) ===
                                          String(row.skillId),
                                      )}
                                      placeholder="スキル"
                                      options={
                                        dataOptionsSkill?.filter(
                                          (option) =>
                                            !rows.find(
                                              (row) =>
                                                row.skillId == option.value,
                                            ),
                                        ) || []
                                      }
                                      className="rounded-none"
                                      labelClass="pl-4"
                                      searchOption
                                      onChange={(e) => {
                                        handleEditCategoryLine(
                                          row.customId,
                                          'skillId',
                                          String(e.value),
                                        );
                                        setRows((prevRows) => {
                                          const updatedRows = [...prevRows];
                                          const rowIndex =
                                            updatedRows.findIndex(
                                              (r) =>
                                                r.customId === row.customId,
                                            );

                                          if (rowIndex !== -1) {
                                            updatedRows[rowIndex].skillId =
                                              String(e.value);
                                          }

                                          return updatedRows;
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="w-[calc((100%_-_48px)/2)] max-w-[calc((100%_-_48px)/2)] border-r-[1px] border-y-[1px] flex justify-center items-center">
                                {row.level}
                              </div>
                              {row.isSubmitted ? (
                                <div className="h-full w-12"></div>
                              ) : (
                                <div className="flex items-center justify-center h-full w-12">
                                  <ImageRound
                                    className="w-[12px] h-[20px] absolute top-1/2 -translate-y-1/2 cursor-grab hover:cursor-pointer hover:opacity-70"
                                    src="/icons/delete.svg"
                                    name="delete item"
                                    onClick={() =>
                                      handleDeleteRow(row.customId)
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
        <div>
          <Button
            className="mt-4"
            onClick={() => {
              setRows((prevRows) => [
                ...prevRows,
                {
                  id: null,
                  customId: uuidv4(),
                  index:
                    prevRows.length > 0
                      ? prevRows[prevRows.length - 1].index + 1
                      : 1,
                  level: 'レベル0',
                  skillId: '',
                  isApplying: false,
                  isSubmitted: false,
                  isShow: true,
                },
              ]);
            }}>
            行追加
          </Button>
        </div>
      </div>
      <div className="w-full flex items-center gap-2 mt-0 mb-3 flex-col">
        <Button
          className="w-[426px]"
          type="submit"
          onClick={handleSubmitSkillMaps}>
          保存
        </Button>
        <Button
          className="w-[426px]"
          variant="secondary"
          type="button"
          onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default EditSkillMapForm;
