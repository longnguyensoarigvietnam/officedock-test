import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { SubmitLevelByOrganization } from '@interfaces/skills';

import { getFullFormattedDate } from '@utils/date';

interface LevelUpListByOrganizationProps {
  orgSubmitLevel: SubmitLevelByOrganization;
}

export const LevelUpListByOrganization = ({
  orgSubmitLevel,
}: LevelUpListByOrganizationProps) => {
  return (
    <div
      className="w-full p-7 bg-[#F8FAFC] rounded-[14px] mb-5 overflow-x-auto scrollbar-gutter-stable max-w-full"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {orgSubmitLevel.organizationName}
      </p>
      {orgSubmitLevel.submitLevels.length == 0 ? (
        <p className="text-sm font-medium">
          現在レベルアップ申請はありません。
        </p>
      ) : (
        <div>
          {/* Header */}
          <div className="flex text-xs mb-4 text-[#77858F] font-medium">
            <div className="w-[138px] border-r borer-[#D2DBE1]">
              <span>申請日時</span>
            </div>
            <div className="w-[calc((100%_-_480px)/6)] px-[24px] border-r borer-[#D2DBE1]">
              <span>申請者</span>
            </div>
            <div className="w-[calc((100%_-_480px)/3)] px-[24px] border-r borer-[#D2DBE1]">
              <span>スキル名</span>
            </div>
            <div className="w-[calc((100%_-_480px)/2)] px-[24px] border-r borer-[#D2DBE1]">
              <span>スキルの定義</span>
            </div>
            <div className="w-[195px] px-[24px] border-r borer-[#D2DBE1]">
              <span>申請のレベル</span>
            </div>
            <div className="w-[148px] px-[24px]">
              <span>申請承認</span>
            </div>
          </div>
          {/* Body */}
          {orgSubmitLevel.submitLevels.map((submitLevel) => {
            return (
              <div
                key={submitLevel.id}
                className="bg-white py-[20px] rounded-[6px]"
                style={{
                  boxShadow: '0px 2px 8px 0px #0000001A',
                }}>
                <div className="flex items-center">
                  <div className="px-[24px] border-r border-[#D2DBE1]">
                    <p className="text-xs font-normal w-[90px]">
                      {getFullFormattedDate(
                        new Date(submitLevel?.createdAt || '') || new Date(),
                      )}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_480px)/6)] px-[24px] flex items-center gap-2 border-r border-[#D2DBE1]">
                    <CustomUserAvatar
                      avatarUrl={submitLevel.staff?.avatar || ''}
                      avatarColor={submitLevel.staff?.avatarColor || ''}
                      size={26}
                    />
                    <p className="max-w-full text-sm font-medium break-all line-clamp-2">
                      {submitLevel.staff.profile.fullName}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_480px)/3)] px-[24px] border-r border-[#D2DBE1]">
                    <p className="text-sm font-medium w-[150px] break-all line-clamp-2 ">
                      {submitLevel.skill.name}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_480px)/2)] px-[24px] border-r border-[#D2DBE1]">
                    <p className="text-sm font-normal w-[100%] break-all line-clamp-2 ">
                      {submitLevel.skill.description || '-'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center w-[195px] border-r border-[#D2DBE1]">
                    <div className="flex items-center justify-center w-full gap-2">
                      <div className="bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                        <p className="text-white text-xs font-medium bg-[#0068B6] rounded-[10px] w-[51px] h-[21px] flex justify-center items-center">
                          STEP{' '}
                          {Number(
                            submitLevel.progression.stepBeforeSubmit.charAt(
                              submitLevel.progression.stepBeforeSubmit.length -
                                1,
                            ),
                          )}
                        </p>
                        <div className="flex gap-1 items-baseline">
                          <p className="text-sm font-medium">Lv.</p>
                          <p className="text-[20px] font-medium">
                            {Number(
                              submitLevel.progression.levelBeforeSubmit.charAt(
                                submitLevel.progression.levelBeforeSubmit
                                  .length - 1,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                      <ImageRound
                        className="w-fit h-fit"
                        src="/icons/blue-chevron.svg"
                        name="Blue chevron"
                      />
                      <div className="relative bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                        <p className="text-white text-xs font-medium bg-[#0068B6] rounded-[10px] w-[51px] h-[21px] flex justify-center items-center">
                          STEP{' '}
                          {Number(
                            submitLevel.progression.stepAfterSubmit.charAt(
                              submitLevel.progression.stepAfterSubmit.length -
                                1,
                            ),
                          )}
                        </p>
                        <div className="flex gap-1 items-baseline">
                          <p className="text-sm font-medium">Lv.</p>
                          <p className="text-[20px] font-medium">
                            {Number(
                              submitLevel.progression.levelAfterSubmit.charAt(
                                submitLevel.progression.levelAfterSubmit
                                  .length - 1,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-[24px]">
                    <Button
                      variant="primary"
                      className="w-[100px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-white">
                      確認する
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
