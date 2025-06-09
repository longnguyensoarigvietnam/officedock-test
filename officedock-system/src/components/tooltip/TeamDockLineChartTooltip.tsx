import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import {
  convertFromNumberToJapaneseTime,
  convertToJapaneseDateRange,
} from '@utils/date';

export const TeamDockLineChartTooltip = ({
  data,
  categoryName,
}: {
  data: any[];
  categoryName: string;
}) => {
  return (
    <div
      className="p-[20px] bg-white rounded-[8px] w-[220px] max-h-[500px] overflow-y-auto"
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}>
      {data.map((point, index) => {
        const isNotLast = index !== data.length - 1;
        return (
          <div
            key={index}
            style={{
              marginBottom: isNotLast ? '8px' : '0',
              borderBottom: isNotLast ? '1px solid #D2DBE1' : 'none',
            }}
            className="flex flex-col gap-[8px]">
            <div className="text-[#77858F] font-normal text-sm text-nowrap">
              {convertToJapaneseDateRange(point.x, point.endDate)}
            </div>
            <div className="flex items-center gap-1">
              <CustomUserAvatar
                avatarUrl={point.avatar}
                avatarColor={point.avatarColor || ''}
                size={24}
              />
              <p className="font-medium text-sm max-w-[200px] truncate">
                {point.label}
              </p>
            </div>
            <p className="text-[16px] font-normal max-w-full break-all line-clamp-2">
              {categoryName}
            </p>
            <p className="font-normal text-[16px] mb-[8px]">
              {convertFromNumberToJapaneseTime(point.y).formattedHours}時間
              {convertFromNumberToJapaneseTime(point.y).formattedMinutes}分
            </p>
          </div>
        );
      })}
    </div>
  );
};
