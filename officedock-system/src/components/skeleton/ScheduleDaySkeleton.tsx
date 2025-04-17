interface ScheduleDaySkeletonProps {
  numberOfResources: number;
  height: number;
}

const ScheduleDaySkeleton: React.FC<ScheduleDaySkeletonProps> = ({
  numberOfResources,
  height,
}) => {
  const numberOfRows = Math.floor(height / 60);

  return (
    <div
      style={{
        height: `${height}px`,
      }}
      className={`flex flex-col  w-full  rounded-md overflow-hidden`}>
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,_60px)]">
        {Array.from({
          length: numberOfRows,
        }).map((_, hourIndex) => (
          <div key={hourIndex} className="flex">
            <div className="w-16 h-[60px] relative top-[28px] bg-[#EBF1F7] flex items-center justify-center ">
              <div className="w-10 h-4 bg-gray-300 rounded-md animate-pulse"></div>
            </div>
            {Array.from({ length: numberOfResources }).map(
              (_, resourceIndex) => (
                <div
                  key={resourceIndex}
                  className="flex-1 h-full border-b border-gray-300 bg-[#EBF1F7] bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite]"
                  style={{ backgroundPositionX: '180%' }}></div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleDaySkeleton;
