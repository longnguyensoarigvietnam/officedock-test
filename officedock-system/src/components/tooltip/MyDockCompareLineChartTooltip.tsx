import ImageRound from '@components/common/ImageRound';

import { DEFAULT_TIME_TEXT } from '@constants';
import { StatisticChartType } from '@constants/enums';

import { convertToJapaneseDateRange, subtractDurations } from '@utils/date';

export const MyDockCompareLineChartTooltip = ({ data }: { data: any[] }) => {
  return (
    <div
      className="p-5 bg-white rounded-[14px] w-[282px] max-h-[500px] overflow-y-auto"
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}>
      {data.map((point, index) => {
        const isNotLast = index !== data.length - 1;
        const standardDuration =
          point.type == StatisticChartType.COMPARE
            ? point.anotherDuration ?? DEFAULT_TIME_TEXT
            : point.duration ?? DEFAULT_TIME_TEXT;
        const compareDuration =
          point.type == StatisticChartType.COMPARE
            ? point.duration ?? DEFAULT_TIME_TEXT
            : point.anotherDuration ?? DEFAULT_TIME_TEXT;
        const diffDuration = subtractDurations(
          standardDuration || DEFAULT_TIME_TEXT,
          compareDuration || DEFAULT_TIME_TEXT,
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
            style={
              isNotLast
                ? {
                    marginBottom: '8px',
                  }
                : undefined
            }
            className="flex flex-col gap-[8px]">
            <div className="flex items-center mb-2 pb-4 border-b border-[#D2DBE1]">
              <div
                className="mr-1 w-3 h-3 rounded-full min-w-[12px]"
                style={{ backgroundColor: point.color }}></div>
              <p className="font-bold text-base max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                {point.label}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="bg-[#EBF1F7] text-primary h-[18px] w-[57px] rounded-[3px] text-xs font-medium flex items-center justify-center">
                  基準期間
                </p>
                <div className="text-[#77858F] font-normal text-sm text-nowrap">
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
              <div className="flex justify-between mb-2 items-center">
                <p className="font-normal text-base">
                  {standardDuration.split(':')[0]}時間
                  {standardDuration.split(':')[1]}分
                </p>
                <div className="flex items-center font-normal text-sm text-[#77858F] gap-1">
                  {displayIcon(diffDuration)}
                  <span>
                    {diffDuration != '00時間00分'
                      ? diffDuration.replace('-', '')
                      : ''}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <p className="bg-[#F9EAEA] text-[#E95062] h-[18px] w-[57px] rounded-[3px] text-xs font-medium flex items-center justify-center">
                  比較期間
                </p>
                <div className="text-[#77858F] font-normal text-sm text-nowrap">
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
              <p className="font-normal text-base mb-2">
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
