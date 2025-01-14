'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { ScreenName, ServerStatusCode } from '@constants/enums';

import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import useOrganizationDetail from '@hooks/useOrganizationDetail';

import { OptionDropdownType } from '@interfaces/common';

import { useToast } from '@providers/ToastProvider';
import { HierarchyStateContext } from '@providers/HierarchyProvider';
import { LoadingContext } from '@providers/LoadingProvider';

interface rowDataType {
  id: number | null;
  customId: string;
  large: string | null;
  medium: string | null;
  small: string | null;
  index: number;
  isShow?: boolean | null;
  skills: { value: number; label: string }[];
}
const CreateHierarchyForm = () => {
  const params = useParams<{ id: string }>();

  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();

  const [dataOptionsCategory, setDataOptionsCategory] = useState<
    OptionDropdownType[]
  >([]);

  const [rows, setRows] = useState<rowDataType[]>([]);

  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});
  const { dataHierarchyDetail, setDataHierarchyDetail } = useContext(
    HierarchyStateContext,
  );

  useOrganizationDetail({
    current_screen: ScreenName.CATEGORY_HIERARCHY,
    organizationId: params.id,
    conditions: [!dataHierarchyDetail],
    onSuccess: (data) => {
      const sortedRows = data.statisticCategories
        .map((org) => ({
          id: org.id,
          large: org.largeStatisticCategory
            ? org.largeStatisticCategory.uuid
            : '',
          medium:
            org.mediumStatisticCategory && org.mediumStatisticCategory !== null
              ? org.mediumStatisticCategory.uuid
              : '',
          small: org.smallStatisticCategory
            ? org.smallStatisticCategory.uuid
            : '',
          index: org.index,
          customId: uuidv4(),
          isShow: true,
          skills: org.skills.map((skill) => ({
            value: skill.id,
            label: skill.name,
          })),
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
      setDataHierarchyDetail(data);
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.HIERARCHY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (creationDataCategoryData) {
      const options = creationDataCategoryData.map((org) => ({
        label: org.name,
        value: org.uuid,
      }));
      setDataOptionsCategory([
        {
          label: '未選択',
          value: '',
        },
        ...options,
      ]);
    }
  }, [creationDataCategoryData]);

  useEffect(() => {
    if (!dataHierarchyDetail) {
      setIsLoading(true);
    } else {
      const sortedRows = dataHierarchyDetail.statisticCategories
        .map((org) => ({
          id: org.id,
          large: org.largeStatisticCategory
            ? org.largeStatisticCategory.uuid
            : '',
          medium:
            org.mediumStatisticCategory && org.mediumStatisticCategory !== null
              ? org.mediumStatisticCategory.uuid
              : '',
          small: org.smallStatisticCategory
            ? org.smallStatisticCategory.uuid
            : '',
          index: org.index,
          customId: uuidv4(),
          isShow: true,
          skills: org.skills.map((skill) => ({
            value: skill.id,
            label: skill.name,
          })),
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataHierarchyDetail]);

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="mb-8 text-lg">{dataHierarchyDetail?.name}</div>
        <div className="w-[97%] divide-y divide-gray-200 ">
          <div className="flex bg-[#F3F4F6] py-3 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200 mx-[1px] ">
            <div className="w-1/4 text-center">大カテゴリ</div>
            <div className="w-1/4 text-center">中カテゴリ</div>
            <div className="w-1/4 text-center">小カテゴリ</div>
            <div className="w-1/4 text-center">カテゴリ対応スキル</div>
          </div>
          <div className="bg-white max-h-[calc(100vh_-_400px)] overflow-y-auto">
            {rows
              .filter((item) => item.isShow !== false)
              .map((row, index) => {
                return (
                  <div key={index} className="flex relative h-full">
                    <div className="w-1/4 ">
                      <p className=" flex h-full justify-center items-center py-2.5 border">
                        {
                          dataOptionsCategory.find(
                            (element) => element.value === row.large,
                          )?.label
                        }
                      </p>
                    </div>
                    <div className="w-1/4">
                      <p className=" flex h-full justify-center items-center py-2.5 border">
                        {
                          dataOptionsCategory.find(
                            (element) => element.value === row.medium,
                          )?.label
                        }
                      </p>
                    </div>
                    <div className="w-1/4">
                      <p className=" flex h-full justify-center items-center py-2.5 border">
                        {
                          dataOptionsCategory.find(
                            (element) => element.value === row.small,
                          )?.label
                        }
                      </p>
                    </div>
                    <div className="w-1/4 flex flex-wrap gap-2 py-2 px-2 border">
                      {row.skills.map((item, index) => {
                        return (
                          <p
                            className="h-[27px] flex items-center px-2 text-xs bg-[#e6e6e6] rounded-sm"
                            key={index}>
                            {item.label}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <div className="w-full flex items-center gap-4 mt-8 flex-col mb-3">
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

export default CreateHierarchyForm;
