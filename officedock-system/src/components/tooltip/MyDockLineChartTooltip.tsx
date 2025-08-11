import {
  convertFromNumberToJapaneseTime,
  convertToJapaneseDateRange,
} from '@utils/date';

export const MyDockLineChartTooltip = ({ data }: { data: any[] }) => {
  return (
    <div
      className="p-[20px] bg-white rounded-[8px] w-[230px] max-h-[500px] overflow-y-auto"
      style={{
        boxShadow: '0px 2px 8px 0px #0000001A',
      }}>
      {data.map((point, index) => {
        const isNotLast = index !== data.length - 1;

        return (
          <div
            key={index}
            style={
              isNotLast
                ? {
                    marginBottom: '8px',
                    borderBottom: '1px solid #D2DBE1',
                  }
                : undefined
            }
            className="flex flex-col gap-[8px]">
            <div className="text-[#77858F] font-normal text-sm mb-[8px]">
              {convertToJapaneseDateRange(point.x, point.endDate)}
            </div>

            <div className="flex items-center mb-[8px]">
              <div
                className="mr-1 w-3 h-3 rounded-full min-w-[12px]"
                style={{ backgroundColor: point.color }}></div>
              <p className="font-bold text-base max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                {point.label}
              </p>
            </div>

            <p className="mb-2 font-normal text-base">
              {convertFromNumberToJapaneseTime(point.y).formattedHours}時間
              {convertFromNumberToJapaneseTime(point.y).formattedMinutes}分
            </p>
          </div>
        );
      })}
    </div>
  );
};
