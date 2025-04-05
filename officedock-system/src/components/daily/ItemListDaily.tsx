import { useRouter } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import { pageRouters } from '@constants/routers';
import {
  dataRequestConfirmType,
  DataUserDetailDailyType,
} from '@interfaces/statistic';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { convertToJapaneseTime } from '@utils/date';

type Props = {
  userData: DataUserDetailDailyType;
  organization: {
    id: number;
    name: string;
  };
  handleConfirm: (dataUser: dataRequestConfirmType) => void;
};

const ItemListDaily = ({ userData, organization, handleConfirm }: Props) => {
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const [isConfirm, setIsConfirm] = useState(userData.isConfirmed);

  useEffect(() => {
    if (userData) {
      setIsConfirm(userData.isConfirmed);
    }
  }, [userData]);

  const router = useRouter();

  const avatarColor =
    dashboardMembersWithAvatars.find((member) => member.id == userData.id)
      ?.avatarColor || '';

  return (
    <div
      key={userData.id}
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}
      className="bg-white p-4 rounded-md font-medium flex gap-3 justify-between">
      <div className="flex gap-5 flex-grow items-center">
        <div className="flex flex-col gap-1 items-center min-w-[50px] text-xs  text-[#0068B6]">
          {isConfirm ? (
            <span>確認済</span>
          ) : (
            <span className="text-[#77858F]">未確認</span>
          )}
          <Checkbox
            isChecked={isConfirm}
            onChange={(e) => {
              handleConfirm({
                id: userData.id,
                isConfirmed: e,
                categoryId: organization.id,
              });
              setIsConfirm(e);
            }}
            className="flex justify-center"
            classSize="w-4 h-4"
            boxLabelClass="!m-0"
          />
        </div>

        <div className="flex items-center gap-[10px]">
          <AvatarIconWithDynamicColor color={avatarColor} size={33} />
          <span className="text-black break-all line-clamp-2 ">
            {userData.fullName}
          </span>
        </div>
      </div>
      <div className="text-xs font-medium flex items-center justify-end gap-[14px] min-w-[240px]">
        <span className="text-[#77858F]">合計時間</span>
        <span className="text-black">
          {userData.totalDuration &&
            convertToJapaneseTime(userData.totalDuration)}
        </span>
        <Button
          onClick={() => {
            router.push(
              `${pageRouters.DAILY_REPORT_TEAM_DETAIL.href(
                String(userData.id),
              )}?organization=${organization.id}`,
            );
          }}
          className="!px-0 !py-0 h-9 w-[98px] items-center justify-center ml-[6px]">
          日報を見る
        </Button>
      </div>
    </div>
  );
};

export default ItemListDaily;
