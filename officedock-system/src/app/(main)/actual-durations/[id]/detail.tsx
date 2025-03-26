'use client';
import React, { useContext, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { format } from 'date-fns';

import Button from '@components/common/Button';
import ViewInfo from '@components/common/ViewInfo';
import Switch from '@components/common/Switch';

import { pageRouters } from '@constants/routers';
import { EventWorkCategory, ServerStatusCode } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { DATE_FORMAT, NO_OPTION_CATEGORY } from '@constants';

import useActualDurationDetail from '@hooks/useActualDurationDetail';

import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import { ActualDurationDefaultData } from '@interfaces/durations';
import { calculateActualDuration, convertToTimeString } from '@utils/date';

const ActualDurationsDetail = () => {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const router = useRouter();
  const [taskScheduleDetail, setTaskScheduleDetail] =
    useState<ActualDurationDefaultData>();

  const { actualDurationDetail } = useActualDurationDetail({
    actualDurationId: Number(params.id),
    onSuccess: (data) => {
      setTaskScheduleDetail({
        title: data.title || '',
        taskId: data.taskId || '',
        scheduleId: data.scheduleId || '',
        isImportant: data.isImportant || false,
        organization: Number(data.organization),
        largeCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.LARGE,
            )?.name || '',
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.LARGE,
            )?.id || '',
        },
        mediumCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.MEDIUM,
            )?.name || '',
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.MEDIUM,
            )?.id || '',
        },
        smallCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.SMALL,
            )?.name || '',
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.SMALL,
            )?.id || '',
        },
        tagIds: data.tags,
        scheduleType: {
          label: data.scheduleType || '',
          value: data.scheduleType || '',
        },
      });
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex flex-col gap-4 items-center">
        <ViewInfo label="タイトル名" className={`break-words`}>
          {taskScheduleDetail?.title || '未設定'}{' '}
        </ViewInfo>
        <ViewInfo label="業務の種類">
          {[
            taskScheduleDetail?.largeCategory?.label,
            taskScheduleDetail?.mediumCategory?.label,
            taskScheduleDetail?.smallCategory?.label,
          ].some(Boolean)
            ? [
                taskScheduleDetail?.largeCategory?.label || NO_OPTION_CATEGORY,
                taskScheduleDetail?.mediumCategory?.label || NO_OPTION_CATEGORY,
                taskScheduleDetail?.smallCategory?.label || NO_OPTION_CATEGORY,
              ]
                .filter(Boolean)
                .join('＞')
            : '未設定'}
        </ViewInfo>

        <ViewInfo label="集計タグ">
          {taskScheduleDetail &&
          taskScheduleDetail.tagIds &&
          taskScheduleDetail.tagIds.length
            ? taskScheduleDetail.tagIds.map((tag, index) => {
                return (
                  <span key={index}>
                    {tag.name}{' '}
                    {index != taskScheduleDetail.tagIds.length - 1 && '／'}
                  </span>
                );
              })
            : '未設定'}{' '}
        </ViewInfo>
        <ViewInfo label="計測時間">
          {actualDurationDetail && actualDurationDetail.startedAt
            ? actualDurationDetail.pausedAt
              ? `${format(`${actualDurationDetail.startedAt}`, DATE_FORMAT)} ${convertToTimeString(`${actualDurationDetail.startedAt}`)} ~ ` +
                `${format(`${actualDurationDetail.pausedAt}`, DATE_FORMAT)} ${convertToTimeString(`${actualDurationDetail.pausedAt}`)}` +
                ` (${calculateActualDuration(
                  String(actualDurationDetail.startedAt),
                  actualDurationDetail.pausedAt
                    ? String(actualDurationDetail.pausedAt)
                    : '',
                )})`
              : `${actualDurationDetail && format(`${actualDurationDetail.startedAt}`, DATE_FORMAT)} ${actualDurationDetail && convertToTimeString(`${actualDurationDetail.startedAt}`)} ~ 計測中`
            : ''}
        </ViewInfo>
        {taskScheduleDetail?.taskId && (
          <ViewInfo label="重要">
            <div className="w-full max-w-48 mt-3">
              <Switch
                customTranslate="!translate-x-[115%]"
                enable={taskScheduleDetail?.isImportant}
                disabled={true}
              />
            </div>
          </ViewInfo>
        )}
        {taskScheduleDetail?.scheduleId && (
          <ViewInfo label="重要">
            {taskScheduleDetail.scheduleType?.label || '未設定'}
          </ViewInfo>
        )}
      </div>
      <div className="w-full flex items-center gap-2 mt-0 flex-col mb-3">
        <Button
          className="w-[426px]"
          variant="secondary"
          type="button"
          onClick={() =>
            router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href)
          }>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default ActualDurationsDetail;
