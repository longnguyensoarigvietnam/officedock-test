interface CalendarSkeletonProps {
  numberOfResources: number;
}

const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({
  numberOfResources,
}) => {
  return (
    <div className="flex flex-col h-[1516px] mt-[37px] pt-[33px] ml-[38px] w-full bg-[#ebf1f4] rounded-md overflow-hidden">
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,_87px)]">
        {Array.from({
          length: 26,
        }).map((_, hourIndex) => (
          <div key={hourIndex} className="flex">
            {Array.from({ length: numberOfResources }).map(
              (_, resourceIndex) => (
                <div
                  key={resourceIndex}
                  className="flex-1 h-full border-b border-gray-300 bg-[#ebf1f4] bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite]"
                  style={{ backgroundPositionX: '180%' }}></div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarSkeleton;
