interface RowsProps {
  numberOfRows?: number;
  className?: string;
}

const RowSkeleton: React.FC<RowsProps> = ({ numberOfRows, className }) => {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: numberOfRows || 1 }).map((_, index) => (
        <div
          key={index}
          className={`rounded-md p-3 bg-[#ECF0F2]  bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite] ${className}`}
          style={{ backgroundPositionX: '180%' }}></div>
      ))}
    </div>
  );
};

export default RowSkeleton;
