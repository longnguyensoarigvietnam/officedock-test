interface CalendarSkeletonProps {
  numberOfResources: number;
  className?: string
}

const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({
  numberOfResources,
  className
}) => {
  return (
    <div className={`flex flex-col h-[1516px] mt-[42px] pt-[20px] w-full bg-[#ebf1f4] rounded-md overflow-hidden ${className}`}>
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,_87px)]">
        {Array.from({
          length: 26,
        }).map((_, hourIndex) => (
          <div key={hourIndex} className="flex ml-[-10px]">
            <div className="w-16 h-[87px] relative top-[0px] bg-[#EBF1F7] flex justify-center ">
              <div className="w-10 h-4 bg-gray-300 rounded-md animate-pulse"></div>
            </div>
            {Array.from({ length: numberOfResources }).map(
              (_, resourceIndex) => (
                <div
                  key={resourceIndex}
                  className="flex-1 h-full border-t mt-[2px] border-gray-300 bg-[#ebf1f4] bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite]"
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
