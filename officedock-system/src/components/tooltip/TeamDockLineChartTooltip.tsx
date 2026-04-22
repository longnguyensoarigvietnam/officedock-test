import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import {
  convertFromNumberToJapaneseTime,
  convertToJapaneseDateRange,
} from '@utils/date';

export const TeamDockLineChartTooltip = ({
  data,
  selectedOptionName,
}: {
  data: any[];
  selectedOptionName: string
}) => {
  return (
    <div
      className="p-[20px] bg-white rounded-[14px] w-[250px] max-h-[500px] overflow-y-auto"
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}>
      {data.map((point, index) => {
        const isNotLast = index !== data.length - 1;
        return (
          <div
            key={index}
            style={{
              marginBottom: isNotLast ? '16px' : '0',
              paddingBottom: isNotLast ? '8px' : '0',
              borderBottom: isNotLast ? '1px solid #D2DBE1' : 'none',
            }}
            className="flex flex-col gap-4">
            <div className="text-[#77858F] font-normal text-sm text-nowrap leading-[1]">
              {convertToJapaneseDateRange(point.x, point.endDate)}
            </div>
            <div className="flex items-center gap-[6px]">
              <CustomUserAvatar
                avatarUrl={point.avatar}
                avatarColor={point.avatarColor || ''}
                size={24}
              />
              <p className="font-medium text-sm max-w-[200px] truncate leading-[1]">
                {point.label}
              </p>
            </div>
            <p className="text-base font-normal max-w-full break-all leading-[1]">
              {selectedOptionName}
            </p>
            <p className="font-normal text-base mb-[8px] leading-[1]">
              {convertFromNumberToJapaneseTime(point.y).formattedHours}時間
              {convertFromNumberToJapaneseTime(point.y).formattedMinutes}分
            </p>
          </div>
        );
      })}
    </div>
  );
};
