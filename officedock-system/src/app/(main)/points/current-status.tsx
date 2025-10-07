'use client';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { MONTH_DATE_TEXT_FORMAT } from '@constants';

import useCoinStatus from '@hooks/useCoinStatus';

import { renderDate } from '@utils/date';

const CurrentStatus = () => {
  const { coinStatus } = useCoinStatus({});
  return (
    <div
      className="rounded-[30px] w-[340px] h-[412px] px-[30px] pt-[40px] pb-[48px] bg-white flex flex-col items-center text-black"
      style={{ boxShadow: '0px 2px 15px 0px #0000001A' }}>
      <p className="font-medium text-lg mb-[30px] leading-none">
        現在のコインの状況
      </p>
      <ImageRound
        name="Badge icon"
        src={'/icons/badge.svg'}
        className={`w-[60px] h-[60px] mb-[10px]`}
      />
      <p className="text-[#77858F] text-base font-medium mb-[10px] leading-none">
        1人あたりの交換可能枚数
      </p>
      <p className="text-[32px] font-medium mb-6 leading-none">
        {/* Format Japanese number, for example: 10000 → 10,000 */}
        {(coinStatus?.exchangeableCoinsPerUser || 0).toLocaleString(
          'ja-JP',
        )}{' '}
        <span className="text-lg ml-1">コイン</span>
      </p>
      <div className="bg-[#EBF1F7] rounded-[8px] py-4 px-[10px] w-[280px] flex flex-col gap-[10px] items-center">
        <div className="flex items-center">
          <ImageRound
            name="Badge icon"
            src={'/icons/badge.svg'}
            className={`w-[19px] h-[19px]`}
          />
          {/* Format Japanese number, for example: 10000 → 10,000 */}
          <p className="text-lg font-medium ml-[6px] leading-none">
            {(coinStatus?.totalCoins || 0).toLocaleString('ja-JP')}
          </p>
          <p className="text-xs font-medium bg-white w-[78px] h-[21px] flex items-center justify-center rounded-[50px] ml-[10px]">
            総コイン数
          </p>
        </div>
        <p className="text-[13px] leading-none">
          ※{renderDate(coinStatus?.issueDate as string, MONTH_DATE_TEXT_FORMAT)}
          付与分：
          {renderDate(
            coinStatus?.expirationDate as string,
            MONTH_DATE_TEXT_FORMAT,
          )}
          失効
        </p>
        <p className="text-sm leading-none">÷</p>
        <div className="flex items-center">
          <CustomUserAvatar avatarUrl={''} avatarColor={'#0068B6'} size={20} />
          <p className="text-lg font-medium ml-[6px] leading-none">
            {coinStatus?.targetUserCount || 0}
          </p>
          <p className="text-xs font-medium bg-white w-[90px] h-[21px] flex items-center justify-center rounded-[50px] ml-[10px] leading-none">
            対象ユーザー
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrentStatus;
