import { useMutation } from 'react-query';
import { Droppable } from '@hello-pangea/dnd';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import ItemNoSetting from './ItemNoSetting';

import { COLUMN_ID_TASK } from '@constants';
import { ActionTask, ItemStartType } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { KanbanDataResponse, NoSettingTotalType } from '@interfaces/task';
import api from '@base/api';

type Props = {
  totalNoSetting: NoSettingTotalType | undefined;
  pinItemToTopNoSetting: (itemId: string | number) => void;
  onAdd: (id: string) => void;
  setTotalNoSetting: React.Dispatch<
    React.SetStateAction<NoSettingTotalType | undefined>
  >;
};

const NoSettingColumn = ({
  setTotalNoSetting,
  pinItemToTopNoSetting,
  totalNoSetting,
  onAdd,
}: Props) => {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();

  const {
    columnWidth,
    orderingOptions,
    selectedOptionZoom,
    listTaskNoSetting,
    setListTaskNoSetting,
  } = useContext(TaskTeamStateContext);
  const [isExtendUser, setIsExtendUser] = useState(true);

  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('action', action);
    params.set('type', ItemStartType.TASK);
    router.push(`?${params.toString()}`);
  };

  const listTaskRef = useRef<HTMLDivElement | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const organizationId = searchParams.get('organization');
  const [page, setPage] = useState<number>(2);

  // API  get more task team
  const handleGetDataTaskMore = async () => {
    setIsLoadingMore(true);
    let apiUrl = `${apiRouters.TASK_TEAM_NO_SETTING}?organization_id=${organizationId}`;

    if (page) {
      apiUrl += `&page=${page}`;
    }
    if (orderingOptions?.user_ids?.length) {
      apiUrl += `&user_ids=${orderingOptions.user_ids.map((item) => item.value).join(',')}`;
    }
    return await api.get<KanbanDataResponse>(apiUrl);
  };
  // Handle call API get more team
  const { mutate: getDataListTaskMore } = useMutation(
    'getDataListTaskNoSettingMore',
    handleGetDataTaskMore,
    {
      onSuccess: ({ data }) => {
        setListTaskNoSetting([...listTaskNoSetting, ...data.results]);
        setTotalNoSetting({
          count: totalNoSetting?.count || 0,
          hasNext: data.hasNext,
        });
      },
      onError: () => {},
      onSettled: () => {
        setIsFetching(false);
        setIsLoadingMore(false);
      },
    },
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && totalNoSetting?.hasNext && !isFetching) {
          setIsFetching(true);
          setPage(page + 1);
          getDataListTaskMore();
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.2,
      },
    );

    if (listTaskRef.current) {
      observer.observe(listTaskRef.current);
    }

    return () => {
      if (listTaskRef.current) {
        observer.unobserve(listTaskRef.current);
      }
    };
  }, [totalNoSetting, isFetching]);

  return (
    <>
      {isExtendUser ? (
        <div
          style={{
            width: `${(columnWidth / 247) * 257}px`,
            minWidth: '154px',
            maxWidth: `${(columnWidth / 247) * 257}px`,
            paddingLeft: 0,
            paddingRight: 0,
          }}
          className={`h-auto min-h-[500px] flex-col  mt-1 px-2 flex-shrink-0 `}>
          <div
            style={{
              width: `${(columnWidth / 247) * 257}px`,
              minWidth: '154px',
              maxWidth: `${(columnWidth / 247) * 257}px`,
              paddingLeft: 0,
              paddingRight: 0,
            }}
            className="h-full">
            <div
              style={{
                width: `${(columnWidth / 247) * 247}px`,
              }}
              className="flex justify-between ">
              <div
                style={{
                  gap: `${(247 / 247) * 10}px`,
                  fontSize: `${(247 / 247) * 15}px`,
                }}
                className="flex items-center gap-[10px] font-medium text-[15px] ">
                <p
                  style={{
                    maxWidth:
                      (selectedOptionZoom.value as number) > 50
                        ? `${(columnWidth / 247) * 108}px`
                        : `${(columnWidth / 247) * 40}px`,
                  }}
                  className="truncate  ">
                  担当者未定
                </p>
                <p
                  style={{
                    maxWidth: `${(columnWidth / 247) * 40}px`,
                  }}
                  className="truncate  text-sm font-medium text-[#77858F] ">
                  {totalNoSetting?.count}
                </p>
              </div>
              <div
                style={{
                  gap: `${(columnWidth / 247) * 10}px`,
                }}
                className="flex items-center">
                <DynamicTooltip content="タスクを新規作成" placement="top">
                  <div
                    style={{
                      padding: '6.5px',
                    }}
                    className={`rounded-full cursor-pointer w-fit bg-white `}
                    onClick={() => {
                      onAdd(COLUMN_ID_TASK);
                      handleSetParam({
                        id: null,
                        action: ActionTask.CREATE,
                      });
                    }}>
                    <ImageRound
                      src={`/icons/add.svg`}
                      name="Add"
                      style={{
                        width: `${(247 / 247) * 9}px`,
                        height: `${(247 / 247) * 9}px`,
                      }}
                    />
                  </div>
                </DynamicTooltip>
                <DynamicTooltip content="タブを縮小" placement="top">
                  <div
                    className="flex items-center justify-center cursor-pointer hover:bg-white rounded-full w-[22px] h-[22px]"
                    onClick={() => setIsExtendUser(false)}>
                    <ImageRound
                      src={`/icons/extend-column.svg`}
                      className={`${isExtendUser ? 'rotate-0' : 'rotate-180'} cursor-pointer`}
                      name="extend"
                      style={{
                        width: `8px`,
                        height: `12px`,
                      }}
                    />
                  </div>
                </DynamicTooltip>
              </div>
            </div>
            <Droppable droppableId={COLUMN_ID_TASK}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    paddingTop: `${(columnWidth / 247) * 22}px`,
                    marginRight: `-${(columnWidth / 247) * 16}px`,
                    boxShadow: `inset -${(columnWidth / 247) * 16}px 0 0 '#EBF1F7'`,
                    minHeight: '500px',
                    maxHeight: '2000px',
                  }}
                  className={`flex-grow overflow-y-auto w-[100%]
                 overflow-x-hidden scrollbar-gutter-stable `}>
                  <div
                    style={{
                      paddingLeft: `${(columnWidth / 247) * 14}px`,
                      paddingRight: `${(columnWidth / 247) * 14}px`,
                      marginRight: `${(columnWidth / 247) * 9}px`,
                      minHeight: '500px',
                    }}
                    className={`flex flex-col overflow-x-hidden  h-full pt-[14px] bg-[#DAE2EB] rounded-lg`}>
                    {listTaskNoSetting.map((item, index) => (
                      <>
                        <ItemNoSetting
                          key={item.id}
                          id={`${item.id}`}
                          index={index}
                          content={item}
                          editTask={() => {}}
                          handlePinItem={pinItemToTopNoSetting}
                          handleActionEditTask={(id: number) => {
                            handleSetParam({
                              id: `${id}`,
                              action: ActionTask.EDIT,
                            });
                          }}
                          handleConfirmCopyTask={() => {}}
                          handleUpdateItemInline={() => {}}
                        />
                      </>
                    ))}
                    {/* Make sure the placeholder is rendered here */}
                    {provided.placeholder}
                    {/* Loading spinner logic */}
                    <div ref={listTaskRef}>
                      {isLoadingMore && (
                        <div className="h-7">
                          <Spinner
                            className="!h-fit py-3"
                            iconClassName="h-6 w-6"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        </div>
      ) : (
        <div className="w-[80px]">
          <div className="flex gap-[6px] h-[33px] items-center justify-center">
            <DynamicTooltip content="タブを拡大" placement="top">
              <div
                className="flex items-center justify-center cursor-pointer hover:bg-white rounded-full w-[22px] h-[22px]"
                onClick={() => setIsExtendUser(true)}>
                <ImageRound
                  src={`/icons/extend-column.svg`}
                  className={`${isExtendUser ? 'rotate-0' : 'rotate-180'} cursor-pointer`}
                  name="extend"
                  style={{
                    width: `8px`,
                    height: `12px`,
                  }}
                />
              </div>
            </DynamicTooltip>
          </div>
          <div
            style={{
              marginBottom: `${(247 / 247) * 14}px`,
              marginTop: `${(247 / 247) * 14}px`,
            }}>
            <p
              style={{
                fontSize: `14px`,
              }}
              className="text-[#77858F] w-full text-center text-sm">
              {totalNoSetting?.count}
            </p>
          </div>
          <div className="w-full flex justify-center">
            <div className={`w-2 h-[600px] bg-[#DEE8EE]`}></div>
          </div>
        </div>
      )}
    </>
  );
};

export default NoSettingColumn;
