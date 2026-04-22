'use client';
import { useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import CensorLevelUpModal from '@components/modals/CensorLevelUpModal';
import Button from '@components/common/Button';
import LevelUpCompletionModal from '@components/modals/LevelUpCompletionModal';

import {
  CensorSubmittedLevelRequest,
  SubmitLevel,
  SubmitLevelByOrganization,
} from '@interfaces/skills';

import useSubmitLevelListByOrganizations from '@hooks/useSubmitLevelListByOrganizations';
import useSubmitLevelDetail from '@hooks/useSubmitLevelDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';

import api from '@base/api';

import { LevelUpListByOrganization } from './level-up-list-by-organization';

const LevelUpList = () => {
  const showErrorToast = useErrorToast();
  const { setIsLoading } = useContext(LoadingContext);

  const searchParams = useSearchParams();
  const tabId = searchParams.get('tabId');

  const [submitLevelUpByOrganization, setSubmitLevelUpByOrganization] =
    useState<SubmitLevelByOrganization[]>([]);
  const [openLevelUpCensoringPopup, setOpenLevelUpCensoringPopup] =
    useState<boolean>(false);
  const [selectedSubmitLevel, setSelectedSubmitLevel] = useState<number | null>(
    null,
  );
  const [selectRejectOption, setSelectRejectOption] = useState<boolean | null>(
    null,
  );
  const [openLevelUpCompletionPopup, setOpenLevelUpCompletionPopup] =
    useState<boolean>(false);
  const [submitLevelUpDetail, setSubmitLevelUpDetail] =
    useState<SubmitLevel | null>(null);

  // Hooks
  const { refetchSubmitLevelList } = useSubmitLevelListByOrganizations({
    currentScreen: ScreenName.TEAM_DOCK_SKILL_MAP,
    onSuccess: (data) => {
      setSubmitLevelUpByOrganization(data);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  useSubmitLevelDetail({
    submitLevelId: Number(selectedSubmitLevel),
    onSuccess: (data) => {
      setSubmitLevelUpDetail(data);
      setOpenLevelUpCensoringPopup(true);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  // Call API to censor level up
  const handleConfirmCensorLevelUp = (data: CensorSubmittedLevelRequest) => {
    censorLevelUp(data);
  };

  const handleCensorLevelUp = async (data: CensorSubmittedLevelRequest) => {
    setOpenLevelUpCensoringPopup(false);
    setIsLoading(true);
    const { data: response } = await api.put(
      apiRouters.SUBMIT_LEVELS_DETAIL(`${selectedSubmitLevel}`),
      data,
    );
    return response;
  };

  const { mutate: censorLevelUp } = useMutation(
    'submitLevelUp',
    handleCensorLevelUp,
    {
      onSuccess: () => {
        setOpenLevelUpCompletionPopup(true);
        setSubmitLevelUpDetail(null);
        setSelectedSubmitLevel(null);
        refetchSubmitLevelList();
        setIsLoading(false);
      },
      onError: (error: AxiosError) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
    },
  );

  return (
    <div className="w-full">
      <div className="sticky z-[21] top-[0px] px-10 py-[27px] bg-[#E6F3FB]">
        <div className="flex gap-2 items-center bg-white w-fit p-[6px] rounded-[20px]">
          <Link href={`${pageRouters.SKILL_MAP_TEAM.href}?tabId=${tabId || 0}`}>
            <Button
              variant="outline"
              className={`w-[100px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              メンバー一覧
            </Button>
          </Link>
          <Button
            variant="primary"
            className={`w-[120px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
            レベルアップ申請
          </Button>
        </div>
      </div>

      <div className="px-10">
        {submitLevelUpByOrganization.length > 0 &&
          submitLevelUpByOrganization.map((orgSubmitLevel, index) => {
            return (
              <LevelUpListByOrganization
                key={index}
                orgSubmitLevel={orgSubmitLevel}
                setSelectedSubmitLevel={setSelectedSubmitLevel}
              />
            );
          })}
      </div>

      {/* Level up censoring modal */}
      {openLevelUpCensoringPopup && submitLevelUpDetail && (
        <CensorLevelUpModal
          open={openLevelUpCensoringPopup}
          submitLevelUpDetail={submitLevelUpDetail}
          selectRejectOption={selectRejectOption}
          setSelectRejectOption={setSelectRejectOption}
          onSubmit={(data: CensorSubmittedLevelRequest) => {
            handleConfirmCensorLevelUp(data);
          }}
          onClose={() => {
            setOpenLevelUpCensoringPopup(false);
            setSubmitLevelUpDetail(null);
            setSelectedSubmitLevel(null);
          }}
        />
      )}

      {/* Level up completion modal */}
      {openLevelUpCompletionPopup && (
        <LevelUpCompletionModal
          open={openLevelUpCompletionPopup}
          selectRejectOption={Boolean(selectRejectOption)}
          onClose={() => {
            setOpenLevelUpCompletionPopup(false);
            setSelectRejectOption(null);
          }}
        />
      )}
    </div>
  );
};

export default LevelUpList;
