'use client';
import { useContext, useState } from 'react';

import CensorLevelUpModal from '@components/modals/CensorLevelUpModal';

import {
  CensorSubmittedLevelRequest,
  SubmitLevel,
  SubmitLevelByOrganization,
} from '@interfaces/skills';

import useSubmitLevelListByOrganizations from '@hooks/useSubmitLevelListByOrganizations';
import useSubmitLevelDetail from '@hooks/useSubmitLevelDetail';

import { LevelUpListByOrganization } from './level-up-list-by-organization';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { useErrorToast } from '@hooks/useErrorToast';
import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';

const LevelUpList = () => {
  const showErrorToast = useErrorToast();
  const { setIsLoading } = useContext(LoadingContext);

  const [submitLevelUpByOrganization, setSubmitLevelUpByOrganization] =
    useState<SubmitLevelByOrganization[]>([]);
  const [openLevelUpCensoringPopup, setOpenLevelUpCensoringPopup] =
    useState<boolean>(false);
  const [selectedSubmitLevel, setSelectedSubmitLevel] = useState<number | null>(
    null,
  );
  const [submitLevelUpDetail, setSubmitLevelUpDetail] =
    useState<SubmitLevel | null>(null);

  // Hooks
  const { refetchSubmitLevelList } = useSubmitLevelListByOrganizations({
    onSuccess: (data) => {
      setSubmitLevelUpByOrganization(data);
    },
  });

  useSubmitLevelDetail({
    submitLevelId: Number(selectedSubmitLevel),
    onSuccess: (data) => {
      setSubmitLevelUpDetail(data);
      setOpenLevelUpCensoringPopup(true);
    },
  });

  // Call API to censor level up
  const handleConfirmCensorLevelUp = (data: CensorSubmittedLevelRequest) => {
    censorLevelUp(data);
  };

  const handleCensorLevelUp = async (data: CensorSubmittedLevelRequest) => {
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

      {openLevelUpCensoringPopup && submitLevelUpDetail && (
        <CensorLevelUpModal
          open={openLevelUpCensoringPopup}
          submitLevelUpDetail={submitLevelUpDetail}
          onSubmit={(data: CensorSubmittedLevelRequest) => {
            handleConfirmCensorLevelUp(data);
          }}
          onClose={(currentStep: number) => {
            setOpenLevelUpCensoringPopup(false);
            setSubmitLevelUpDetail(null);
            setSelectedSubmitLevel(null);
            if (currentStep == 4) {
              refetchSubmitLevelList();
            }
          }}
        />
      )}
    </div>
  );
};

export default LevelUpList;
