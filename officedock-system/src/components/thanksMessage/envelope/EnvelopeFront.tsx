export const EnvelopeFront = () => {
  return (
    <div className="">
      <div className="relative flex items-center justify-between w-[620px]">
        <div className="w-[250px] h-[330px] clip-envelope-left-front bg-[#E85D7E] shadow-md rounded-bl-[20px]" />
        <div className="w-[250px] h-[330px] clip-envelope-right-front bg-[#E85D7E] shadow-md rounded-br-[20px]" />
        <div className="absolute w-[620px] h-[250px] top-[80px] clip-envelope-front bg-[#F86683] shadow-md rounded-b-[20px]" />
      </div>
    </div>
  );
};