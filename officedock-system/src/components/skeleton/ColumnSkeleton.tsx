interface ColumnsProps {
  numberOfColumns: number;
}

const ColumnsSkeleton: React.FC<ColumnsProps> = ({ numberOfColumns }) => {
  return (
    <div className="flex gap-5 h-full max-w-[970px]">
      {Array.from({ length: numberOfColumns }).map((_, index) => (
        <div
          key={index}
          className={`flex-1 w-[250px] rounded-md p-3 h-full bg-[#ECF0F2]  bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite]`}
          style={{ backgroundPositionX: '180%' }}></div>
      ))}
    </div>
  );
};

export default ColumnsSkeleton;
