'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'react-query';
import { Popover, PopoverButton } from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { apiRouters } from '@constants/routers';

import { OptionDropdownType } from '@interfaces/common';
import { CreationStatisticType } from '@interfaces/statistic';
import { TagCreationStatisticType, TagId } from '@interfaces/tag';
import api from '@base/api';

type Props = {
  isEvent: boolean;
  tagList: OptionDropdownType[];
  taskId: number;
  optionsTag: CreationStatisticType | undefined;
};

const TagListInfo = ({
  tagList,
  optionsTag,
  taskId,
  isEvent = false,
}: Props) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [tagOptionList, setTagOptionList] = useState<OptionDropdownType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [listTagActive, setListTagActive] =
    useState<OptionDropdownType[]>(tagList);
  const [isPreventAction, setPreventAction] = useState(false);

  const filterTags = (
    tags: TagCreationStatisticType[],
    items: OptionDropdownType[],
  ): TagCreationStatisticType[] => {
    const itemIds = new Set(items.map((item) => Number(item.value)));

    return tags.filter((tag) => {
      if (tag.deletedAt && itemIds.has(tag.id)) {
        return true;
      }
      return !tag.deletedAt;
    });
  };

  useEffect(() => {
    if (tagList) {
      setListTagActive(tagList);
    }
  }, [tagList]);

  useEffect(() => {
    if (optionsTag) {
      setTagOptionList(
        filterTags(optionsTag.tags, listTagActive).map((item) => ({
          label: item.name,
          value: item.id,
        })),
      );
    }
  }, [listTagActive, optionsTag]);

  // API edit data task in daily
  const handleEditTaskInline = async (dataTask: {
    id: string;
    tagIds?: TagId[];
  }) => {
    setPreventAction(true);
    const { data } = await api.patch(
      apiRouters.TASK_DETAIL(`${dataTask.id}`),
      dataTask,
    );
    return data;
  };
  const { mutate: editTaskDailyInline } = useMutation(
    'postEditDailyTaskInline',
    handleEditTaskInline,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {
        setPreventAction(false);
      },
    },
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (popupRef.current?.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <>
      <Popover className="relative">
        {({ open }) => (
          <>
            <div className="flex gap-2 items-center">
              <PopoverButton
                ref={buttonRef}
                className={`flex w-full items-center rounded-full focus:outline-none ${
                  open ? 'text-primary' : ''
                }`}
                onClick={() => {
                  if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect();
                    setPosition({
                      top: rect.bottom + window.scrollY - 172,
                      left: rect.left + window.scrollX - 100,
                    });
                  }
                  setIsOpen(!isOpen);
                }}>
                <ImageRound
                  className="w-4 h-4"
                  src={`/icons/${listTagActive.length > 0 ? 'ticket-active.svg' : 'ticket-no-active.svg'}`}
                  name="icon tag"
                />
              </PopoverButton>
            </div>
          </>
        )}
      </Popover>

      {isOpen &&
        position.top &&
        position.left &&
        createPortal(
          <>
            <div
              ref={popupRef}
              className="absolute z-50 w-[144px] overflow-hidden bg-white rounded-lg shadow-common"
              style={{ top: `${position.top}px`, left: `${position.left}px` }}>
              <div className="relative flex w-[144px] rounded-md overflow-y-auto min-h-[144px] max-h-[144px] flex-col p-[14px] gap-[10px] text-gray-700">
                <p className="text-xs font-medium text-[#77858F] text-left">
                  タグ
                </p>
                {tagOptionList.map((item) => (
                  <div key={item.value} className="flex gap-3">
                    <div className="w-fit h-fit flex-shrink-0">
                      <Button
                        variant="text"
                        className="!w-fit !h-fit !p-0 !bg-transparent"
                        disabled={isPreventAction || isEvent}
                        onClick={() => {
                          if (
                            listTagActive.some(
                              (tag) => String(tag.value) == String(item.value),
                            )
                          ) {
                            const dataTag = listTagActive.filter(
                              (tag) => String(tag.value) != String(item.value),
                            );
                            setListTagActive([...dataTag]);
                            editTaskDailyInline({
                              id: String(taskId),
                              tagIds: dataTag.map((tag) => ({
                                tagId: tag.value,
                                name: tag.label,
                              })),
                            });
                          } else {
                            const dataTag = [
                              ...listTagActive,
                              {
                                label: item.label,
                                value: item.value,
                              },
                            ];
                            setListTagActive(dataTag);
                            editTaskDailyInline({
                              id: String(taskId),
                              tagIds: dataTag.map((tag) => ({
                                tagId: tag.value,
                                name: tag.label,
                              })),
                            });
                          }
                        }}>
                        <ImageRound
                          className="w-4 h-4"
                          src={`/icons/${listTagActive.some((tag) => String(tag.value) == String(item.value)) ? 'ticket-active.svg' : 'ticket-no-active.svg'}`}
                          name="icon tag"
                        />
                      </Button>
                    </div>
                    <div className="break-all text-left w-fit max-w-[100px]">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default TagListInfo;
