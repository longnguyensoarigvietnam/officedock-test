'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { ServerStatusCode } from '@constants/enums';

import { useToast } from '@providers/ToastProvider';
import useOrganizationSkillDetail from '@hooks/useOrganizationSkillDetail';
import { Level } from '@interfaces/skills';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { OrganizationSkillStateContext } from '@providers/OrganizationSkillProvider';
import { LoadingContext } from '@providers/LoadingProvider';
interface rowDataType {
  id?: number | null;
  skill?: {
    name: string | null;
    id: number | null;
  };
  defineSkill: string;
  levels: {
    level1: Level;
    level2: Level;
    level3: Level;
  };
  index: number;
}

const DetailOrganizationSkill = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const [rows, setRows] = useState<rowDataType[]>([]);
  const { expanded } = useContext(GlobalStateContext);
  const { dataOrganizationSkillDetail, setDataOrganizationSkillDetail } =
    useContext(OrganizationSkillStateContext);

  useOrganizationSkillDetail({
    organizationId: `${params.id}`,
    conditions: [!dataOrganizationSkillDetail],
    onSuccess: (data) => {
      const sortedRows = data
        .map((org) => ({
          id: org.id,
          defineSkill: org.defineSkill || '',
          skill: {
            id: org.skill ? org.skill.id : null,
            name: org.skill ? org.skill.name : null,
          },
          index: org.index,
          levels: {
            level1: {
              measurementCount: org.levels.level1.measurementCount || null,
              measurementTime: org.levels.level1.measurementTime || null,
              reviewPeriod: org.levels.level1.reviewPeriod || '',
              descriptions: org.levels.level1.descriptions
                ? org.levels.level1.descriptions.map((desc, index) => {
                    return {
                      label: desc,
                      value: index + 1,
                    };
                  })
                : [],
            },
            level2: {
              measurementCount: org.levels.level2.measurementCount || null,
              measurementTime: org.levels.level2.measurementTime || null,
              reviewPeriod: org.levels.level2.reviewPeriod || '',
              descriptions: org.levels.level2.descriptions
                ? org.levels.level2.descriptions.map((desc, index) => {
                    return {
                      label: desc,
                      value: index + 1,
                    };
                  })
                : [],
            },
            level3: {
              measurementCount: org.levels.level3.measurementCount || null,
              measurementTime: org.levels.level3.measurementTime || null,
              reviewPeriod: org.levels.level3.reviewPeriod || '',
              descriptions: org.levels.level3.descriptions
                ? org.levels.level3.descriptions.map((desc, index) => {
                    return {
                      label: desc,
                      value: index + 1,
                    };
                  })
                : [],
            },
          },
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
      setDataOrganizationSkillDetail(data);
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ORGANIZATION_SKILLS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (!dataOrganizationSkillDetail) {
      setIsLoading(true);
    } else {
      if (
        dataOrganizationSkillDetail &&
        dataOrganizationSkillDetail.length > 0
      ) {
        const sortedRows = dataOrganizationSkillDetail
          .map((org) => ({
            id: org.id,
            defineSkill: org.defineSkill || '',
            skill: {
              id: org.skill ? org.skill.id : null,
              name: org.skill ? org.skill.name : null,
            },
            index: org.index,
            levels: {
              level1: {
                measurementCount: org.levels.level1.measurementCount || null,
                measurementTime: org.levels.level1.measurementTime || null,
                reviewPeriod: org.levels.level1.reviewPeriod || '',
                descriptions: org.levels.level1.descriptions
                  ? org.levels.level1.descriptions.map((desc, index) => {
                      return {
                        label: desc,
                        value: index + 1,
                      };
                    })
                  : [],
              },
              level2: {
                measurementCount: org.levels.level2.measurementCount || null,
                measurementTime: org.levels.level2.measurementTime || null,
                reviewPeriod: org.levels.level2.reviewPeriod || '',
                descriptions: org.levels.level2.descriptions
                  ? org.levels.level2.descriptions.map((desc, index) => {
                      return {
                        label: desc,
                        value: index + 1,
                      };
                    })
                  : [],
              },
              level3: {
                measurementCount: org.levels.level3.measurementCount || null,
                measurementTime: org.levels.level3.measurementTime || null,
                reviewPeriod: org.levels.level3.reviewPeriod || '',
                descriptions: org.levels.level3.descriptions
                  ? org.levels.level3.descriptions.map((desc, index) => {
                      return {
                        label: desc,
                        value: index + 1,
                      };
                    })
                  : [],
              },
            },
          }))
          .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

        setRows(sortedRows);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataOrganizationSkillDetail]);

  return (
    <div className="flex flex-col justify-between h-full">
      <div
        className={`max-h-[calc(100vh_-_290px)] ${expanded ? 'max-w-[calc(100vw_-_260px)]' : 'max-w-[calc(100vw_-_150px)]'}  overflow-x-auto ring-1 ring-gray-200 rounded-tl-2xl rounded-tr-2xl bg-white`}>
        <div className="sticky top-0 z-10 grid grid-cols-[250px_450px_repeat(2,150px)_180px_450px_repeat(2,150px)_180px_450px_repeat(2,150px)_180px_450px] [&>div]:bg-[#F3F4F6] ">
          <div className="px-5 py-3 w-[250px] border-r-[1px] font-normal row-span-2 flex items-center justify-center">
            スキル
          </div>
          <div className="px-5 py-3 w-[450px] border-r-[1px] font-normal row-span-2 flex items-center justify-center">
            スキルの定義
          </div>
          <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
            レベル0→1条件
          </div>
          <div className="px-5 py-3 w-[450px] border-r-[1px] border-b-[1px] font-normal flex items-center justify-center">
            レベル0→1
          </div>
          <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
            レベル1→2条件
          </div>
          <div className="px-5 py-3 w-[450px] border-r-[1px] border-b-[1px] font-normal flex items-center justify-center">
            レベル1→2
          </div>
          <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
            レベル2→3条件
          </div>
          <div className="px-5 py-3 w-[450px] border-b-[1px] font-normal flex items-center justify-center">
            レベル2→3
          </div>

          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測回数
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測時間
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            振り返り期間
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            初心者
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測回数
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測時間
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            振り返り期間
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            必達
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測回数
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            計測時間
          </div>
          <div className="px-5 py-3 font-normal border-r-[1px] flex items-center justify-center">
            振り返り期間
          </div>
          <div className="px-5 py-3 font-normal flex items-center justify-center">
            上級
          </div>
        </div>
        <div className="!bg-white relative">
          {rows.map((row) => (
            <div className="flex relative" key={row.id}>
              <div className="py-3 w-[250px] border-r-[1px] border-b-[1px]">
                <p className="!w-[250px] text-left px-2">
                  {row.skill ? row.skill.name : ''}
                </p>
              </div>
              <div className="py-3 w-[450px] border-r-[1px] border-b-[1px]">
                <p className="break-words w-[450px] px-2 text-left">
                  {row.defineSkill ? row.defineSkill : ''}
                </p>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words !w-[150px]">
                  {row.levels.level1.measurementCount
                    ? row.levels.level1.measurementCount
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words !w-[150px]">
                  {row.levels.level1.measurementTime
                    ? row.levels.level1.measurementTime
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[180px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words !w-[180px]">
                  {row.levels.level1.reviewPeriod
                    ? row.levels.level1.reviewPeriod
                    : ''}
                </p>
              </div>
              <div className="py-3 px-2 w-[450px] border-r-[1px] border-b-[1px]">
                <div className="flex flex-wrap gap-2 justify-start w-[450px]">
                  {row.levels.level1.descriptions &&
                    row.levels.level1.descriptions.map((option, index) => (
                      <p
                        key={index}
                        className="break-words !max-w-[400px] bg-gray-200 px-3 py-1 rounded-md text-sm">
                        {option.label}
                      </p>
                    ))}
                </div>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[150px]">
                  {row.levels.level2.measurementCount
                    ? row.levels.level2.measurementCount
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[150px]">
                  {row.levels.level2.measurementTime
                    ? row.levels.level2.measurementTime
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[180px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[180px]">
                  {row.levels.level2.reviewPeriod
                    ? row.levels.level2.reviewPeriod
                    : ''}
                </p>
              </div>
              <div className="py-3 px-2 w-[450px] border-r-[1px] border-b-[1px]">
                <div className="flex flex-wrap gap-2 justify-start w-[450px]">
                  {row.levels.level2.descriptions &&
                    row.levels.level2.descriptions.map((option, index) => (
                      <p
                        key={index}
                        className="break-words !max-w-[400px] bg-gray-200 px-3 py-1 rounded-md text-sm">
                        {option.label}
                      </p>
                    ))}
                </div>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[150px]">
                  {row.levels.level3.measurementCount
                    ? row.levels.level3.measurementCount
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[150px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[150px]">
                  {row.levels.level3.measurementTime
                    ? row.levels.level3.measurementTime
                    : ''}
                </p>
              </div>
              <div className="py-3 w-[180px] border-r-[1px] border-b-[1px] text-center">
                <p className="break-words w-[180px]">
                  {row.levels.level3.reviewPeriod
                    ? row.levels.level3.reviewPeriod
                    : ''}
                </p>
              </div>
              <div className="py-3 px-2 w-[450px] border-b-[1px]">
                <div className="flex flex-wrap gap-2 justify-start w-[450px]">
                  {row.levels.level3.descriptions &&
                    row.levels.level3.descriptions.map((option, index) => (
                      <p
                        key={index}
                        className="break-words !max-w-[400px] bg-gray-200 px-3 py-1 rounded-md text-sm">
                        {option.label}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full flex items-center gap-4 mt-8 justify-center mb-3">
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

export default DetailOrganizationSkill;
