import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { StatisticChartType } from '@constants/enums';
import { convertToJapaneseDateRange, subtractDurations } from '@utils/date';

export const TeamDockCompareLineChartTooltip = ({
  data,
  categoryName,
}: {
  data: any[];
  categoryName: string;
}) => {
  return (
    <div
      className="p-[13px] bg-white rounded-[8px] w-[260px] max-h-[500px] overflow-y-auto"
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}>
      {data.map((point, index) => {
        const isNotLast = index !== data.length - 1;
        const standardDuration =
          point.type == StatisticChartType.COMPARE
            ? point.anotherDuration ?? '00:00:00'
            : point.duration ?? '00:00:00';
        const compareDuration =
          point.type == StatisticChartType.COMPARE
            ? point.duration ?? '00:00:00'
            : point.anotherDuration ?? '00:00:00';
        const diffDuration = subtractDurations(
          standardDuration || '00:00:00',
          compareDuration || '00:00:00',
        );

        const displayIcon = (diffDuration: string) => {
          if (diffDuration.startsWith('-')) {
            return (
              <ImageRound
                name="Detail"
                src={'/icons/decrease-icon.svg'}
                className="w-[12px] h-[12px] hover:cursor-pointer"
              />
            );
          } else if (diffDuration != '00時間00分') {
            return (
              <ImageRound
                name="Detail"
                src={'/icons/increase-icon.svg'}
                className="w-[12px] h-[12px] hover:cursor-pointer"
              />
            );
          } else {
            return (
              <ImageRound
                name="Detail"
                src={'/icons/equal-icon.svg'}
                className="w-[12px] h-[12px] hover:cursor-pointer"
              />
            );
          }
        };

        return (
          <div
            key={index}
            style={{
              marginBottom: isNotLast ? '8px' : '0',
            }}
            className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-1">
              <CustomUserAvatar
                avatarUrl={point.user.avatar}
                avatarColor={point.user.avatarColor || ''}
                size={24}
              />
              <p className="font-medium text-sm max-w-[200px] truncate">
                {point.user.fullName}
              </p>
            </div>
            <p className="text-[16px] font-normal max-w-full break-all line-clamp-2 border-b-[1px] border-b-[#D2DBE1] pb-[8px]">
              {categoryName}
            </p>
            <div>
              <div className="flex justify-between items-center mb-[8px]">
                <p className="bg-[#EBF1F7] text-[#0068B6] h-[18px] w-[57px] rounded-[3px] text-xs font-medium flex items-center justify-center">
                  基準期間
                </p>
                <div className="text-[#77858F] font-normal text-xs text-nowrap">
                  {point.type == StatisticChartType.COMPARE
                    ? point.anotherStartDate
                      ? convertToJapaneseDateRange(
                          point.anotherStartDate as string,
                          point.anotherEndDate as string,
                        )
                      : ''
                    : point.startDate
                      ? convertToJapaneseDateRange(
                          point.startDate as string,
                          point.endDate as string,
                        )
                      : ''}
                </div>
              </div>
              <div className="flex justify-between mb-[8px] items-end">
                <p className="font-normal text-[16px]">
                  {standardDuration.split(':')[0]}時間
                  {standardDuration.split(':')[1]}分
                </p>
                <div className="flex items-center font-normal text-sm gap-[4px] text-[#77858F]">
                  {displayIcon(diffDuration)}
                  <span>
                    {diffDuration != '00時間00分'
                      ? diffDuration.replace('-', '')
                      : ''}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-[8px]">
                <p className="bg-[#F9EAEA] text-[#C32E2E] h-[18px] w-[57px] rounded-[3px] text-xs font-medium flex items-center justify-center">
                  比較期間
                </p>
                <div className="text-[#77858F] font-normal text-xs text-nowrap">
                  {point.type == StatisticChartType.COMPARE
                    ? point.startDate
                      ? convertToJapaneseDateRange(
                          point.startDate as string,
                          point.endDate as string,
                        )
                      : ''
                    : point.anotherStartDate
                      ? convertToJapaneseDateRange(
                          point.anotherStartDate as string,
                          point.anotherEndDate as string,
                        )
                      : ''}
                </div>
              </div>
              <p className="font-normal text-[16px] mb-[8px]">
                {compareDuration.split(':')[0]}時間
                {compareDuration.split(':')[1]}分
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
