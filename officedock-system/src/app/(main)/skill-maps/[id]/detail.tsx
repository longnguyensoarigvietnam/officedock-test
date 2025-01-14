'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import LevelUpInfoModal from '@components/modals/LevelUpInfoModal';

import { apiRouters, pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { LevelName, LevelUpAction, ServerStatusCode } from '@constants/enums';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { SkillMapStateContext } from '@providers/SkillMapProvider';

import useSkillMapDetail from '@hooks/useSkillMapDetail';
import { CreateSubmitLevelsFormData } from '@interfaces/skills';
import { Role } from '@interfaces/role';
import api from '@base/api';

interface rowDataType {
  id?: number | null;
  customId: string;
  skillId: number | string;
  level: string;
  index: number;
  isApplying: boolean;
  isShow: boolean;
  isCanSubmit: boolean;
}
const DetailSkillMap = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();

  const [rows, setRows] = useState<rowDataType[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<{
    id: number;
    currentLevel: string;
    name: string | undefined;
    levelUpInfo: string[] | null | undefined;
  }>();
  const [isOpenLevelUpSubmitModal, setIsOpenLevelUpSubmitModal] =
    useState<boolean>(false);
  const { dataSkillMapDetail, setDataSkillMapDetail } =
    useContext(SkillMapStateContext);

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
          isCanSubmit: data.isCanSubmit || false,
          index: org.index,
          customId: uuidv4(),
          isShow: org.skill && org.skill.id ? true : false,
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
          isCanSubmit: dataSkillMapDetail.isCanSubmit || false,
          index: org.index,
          customId: uuidv4(),
          isShow: org.skill && org.skill.id ? true : false,
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSkillMapDetail]);

  const handleOpenLevelUpSubmitModal = (
    skillId: number | string,
    currentLevel: string,
  ) => {
    const foundSkill = dataSkillMapDetail?.skillMaps.find(
      (orgSkill: any) => String(orgSkill.skill?.id) == String(skillId),
    );
    setSelectedSkill({
      id: Number(foundSkill?.skill?.id),
      currentLevel,
      name: foundSkill?.skill?.name,
      levelUpInfo:
        currentLevel == LevelName.LEVEL0
          ? foundSkill?.skillLevels &&
            foundSkill?.skillLevels.level1.descriptions
          : currentLevel == LevelName.LEVEL1
            ? foundSkill?.skillLevels &&
              foundSkill?.skillLevels.level2.descriptions
            : foundSkill?.skillLevels &&
              foundSkill?.skillLevels.level3.descriptions,
    });
    setIsOpenLevelUpSubmitModal(true);
  };

  const handleSubmitLevelUp = async (
    submitData: CreateSubmitLevelsFormData,
  ) => {
    const apiUrl = apiRouters.SUBMIT_LEVELS_LIST;

    const { data } = await api.post(apiUrl, submitData);
    return data;
  };

  const { mutate: submitLevelUp } = useMutation(
    'submitLevelUp',
    handleSubmitLevelUp,
    {
      onSuccess: (data) => {
        setIsOpenLevelUpSubmitModal(false);
        setRows((prevRows) => {
          const updatedRows = [...prevRows];
          const rowIndex = updatedRows.findIndex(
            (r) => Number(r.skillId) == Number(data.skill.id),
          );

          if (rowIndex !== -1) {
            updatedRows[rowIndex].isApplying = true;
          }

          return updatedRows;
        });
      },
    },
  );

  const handleConfirmSubmitLevelUp = () => {
    submitLevelUp({
      staffId: Number(searchParams.get('staffId')),
      organizationId: Number(searchParams.get('organizationId')),
      skillId: selectedSkill?.id ? Number(selectedSkill?.id) : 0,
      levelBeforeSubmit: selectedSkill?.currentLevel
        ? String(selectedSkill?.currentLevel)
        : '',
    });
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="">
        <div className="flex items-center mb-5">
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
                  dataSkillMapDetail?.staff.roles.map((role: Role, index) => {
                    return (
                      <span key={index}>
                        {role.name}
                        {index != dataSkillMapDetail?.staff.roles.length - 1 &&
                          ','}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
          <div className="ml-64">
            <p className="font-normal text-lg mb-2 ">レベルの説明</p>
            <p className="font-normal text-lg mb-2 ">ポイントの付与の説明</p>
          </div>
        </div>

        <div className="w-[70%] divide-y divide-gray-200 ring-1 ring-gray-200 rounded-2xl">
          <div className="flex bg-[#F3F4F6] rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200 mx-[1px] ">
            <div className="flex-grow text-center w-1/3 py-3">スキル</div>
            <div className="flex-grow text-center w-1/3 border-r-[1px] py-3">
              レベル
            </div>
            <div className="flex-grow text-center w-1/3 flex items-center justify-center"></div>
          </div>

          <div className="bg-white max-h-[calc(100vh_-_470px)] overflow-y-auto">
            {rows
              .filter((row) => row.isShow == true)
              .map((row, index) => {
                return (
                  <div key={row.id} className="flex relative">
                    <div
                      className={`w-1/3 border-r-[1px] py-2 ${rows.length - 1 !== index && 'border-b-[1px]'}`}>
                      <p className="flex flex-col items-center">
                        <span className="truncate max-w-[150px]">
                          {
                            dataSkillMapDetail?.skillMaps.find(
                              (skillMap) =>
                                skillMap.skill &&
                                String(skillMap.skill.id) ==
                                  String(row.skillId),
                            )?.skill.name
                          }
                        </span>
                      </p>
                    </div>
                    <p
                      className={`w-1/3 border-r-[1px] flex flex-col py-2 items-center justify-center ${rows.length - 1 !== index && 'border-b-[1px]'}`}>
                      {row.level}
                    </p>
                    <div
                      className={`w-1/3 flex items-center gap-5 justify-center ${rows.length - 1 !== index && 'border-b-[1px]'}`}>
                      {row.isApplying ? (
                        <Button
                          variant={'outline'}
                          disabled={true}
                          className="!py-[5px] !px-1.5 !bg-slate-200 border-slate-800 !text-slate-800">
                          申請中
                        </Button>
                      ) : (
                        <Button
                          variant={'outline'}
                          disabled={
                            !row.skillId ||
                            row.level == LevelName.LEVEL3 ||
                            row.isCanSubmit == false
                          }
                          className={`!py-[5px] !px-1.5 ${row.level == LevelName.LEVEL3 && '!bg-slate-200 border-slate-800 !text-slate-800'}`}
                          onClick={() =>
                            handleOpenLevelUpSubmitModal(row.skillId, row.level)
                          }>
                          レベルアップ申請
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="w-full flex items-center gap-4 mt-8 justify-center mb-3">
        <Button
          variant="secondary"
          type="button"
          className="w-[426px]"
          onClick={() => router.back()}>
          戻る
        </Button>
      </div>
      <LevelUpInfoModal
        open={isOpenLevelUpSubmitModal}
        skillName={selectedSkill?.name || ''}
        levelUpInfo={selectedSkill?.levelUpInfo || []}
        triggerAction={LevelUpAction.EDIT}
        onClose={() => {
          setIsOpenLevelUpSubmitModal(false);
        }}
        onSubmit={handleConfirmSubmitLevelUp}
      />
    </div>
  );
};

export default DetailSkillMap;
