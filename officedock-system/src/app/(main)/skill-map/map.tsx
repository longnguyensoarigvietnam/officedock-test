'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import ReviewSubmittedLevelUpModal from '@components/modals/ReviewSubmittedLevelUpModal';
import Button from '@components/common/Button';
import { SkillMapBanner } from '@components/skillMap/SkillMapBanner';

import useSkillMapInfo from '@hooks/useSkillMapList';
import useSubmitLevelDetail from '@hooks/useSubmitLevelDetail';

import { SkillMapByOrganization, SubmitLevel } from '@interfaces/skills';

import { pageRouters } from '@constants/routers';

import { SkillMapByOrganizationPanel } from './skill-map-by-organization-panel';

const SkillMap = () => {
  // Router
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabId = searchParams.get('tabId');

  // Skill map list
  const [skillMapByOrganizations, setSkillMapByOrganizations] = useState<
    SkillMapByOrganization[]
  >([]);

  // Submit level id
  const [submitLevelIdParam, setSubmitLevelIdParam] = useState<string | null>(
    searchParams.get('submitLevelId'),
  );
  const [selectedSubmitLevel, setSelectedSubmitLevel] = useState<number | null>(
    null,
  );
  const [submitLevelUpDetail, setSubmitLevelUpDetail] =
    useState<SubmitLevel | null>(null);
  const [openReviewSubmittedLevelupPopup, setOpenReviewSubmittedLevelupPopup] =
    useState<boolean>(false);

  // Get skill map info
  const { skillMapInfo } = useSkillMapInfo({
    onSuccess: (data) => {
      setSkillMapByOrganizations(data.organizations);
    },
  });

  // Get submit level detail
  useSubmitLevelDetail({
    submitLevelId: Number(selectedSubmitLevel),
    onSuccess: (data) => {
      setSubmitLevelUpDetail(data);
      setOpenReviewSubmittedLevelupPopup(true);
    },
  });

  // Remove params from URL
  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('submitLevelId');
    setSubmitLevelIdParam(null);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    if (submitLevelIdParam) {
      setSelectedSubmitLevel(Number(submitLevelIdParam));
    }
  }, [submitLevelIdParam]);

  return (
    <div className="w-full">
      <div className="sticky z-[21] top-[0px] px-10 py-[27px] bg-[#E6F3FB]">
        <div className="flex gap-[6px] items-center bg-white w-fit p-[6px] rounded-[20px]">
          <Button
            variant="primary"
            className={`w-[90px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
            スキルマップ
          </Button>
          <Link href={`${pageRouters.SKILL_MAP_SKILL.href}?tabId=${tabId || 0}`}>
            <Button
              variant="secondary"
              className={`w-[90px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              マイスキル
            </Button>
          </Link>
          <Link href={`${pageRouters.SKILL_LIST_MANAGEMENT.href}?tabId=${tabId || 0}`}>
            <Button
              variant="secondary"
              className={`w-[90px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              スキル一覧
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-10">
        {/* Banner */}
        <SkillMapBanner skillMapInfo={skillMapInfo}/>

        {/* Skill map by organizations */}
        {skillMapByOrganizations.length > 0 &&
          skillMapByOrganizations.map((skillMap, index) => (
            <SkillMapByOrganizationPanel
              key={index}
              skillMapDetail={skillMap}
              userId={skillMapInfo?.user.id || 0}
            />
          ))}
      </div>

      {/* Review submitted level up modal */}
      {openReviewSubmittedLevelupPopup &&
        selectedSubmitLevel &&
        submitLevelUpDetail && (
          <ReviewSubmittedLevelUpModal
            open={openReviewSubmittedLevelupPopup}
            submitLevelUpDetail={submitLevelUpDetail}
            onClose={() => {
              setOpenReviewSubmittedLevelupPopup(false);
              setSelectedSubmitLevel(null);
              handleRemoveParam();
            }}
          />
        )}
    </div>
  );
};

export default SkillMap;
