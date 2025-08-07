import ImageRound from "@components/common/ImageRound";

export const MyPageMenu = () => {
  return (
    <div className="flex flex-col gap-[35px]">
      {/* HEART */}
      <div
        style={{
          background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          boxShadow: '0px 4px 0px 0px #0028A140',
        }}
        className="relative w-[110px] cursor-pointer hover:opacity-80 h-[78px] rounded-[10px] pb-[10px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
        <p>サンクス</p>
        <p>メッセージ</p>
        <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
          <ImageRound
            name="Heart icon"
            src={'/icons/heart.svg'}
            className={`w-fit h-fit `}
          />
        </div>
      </div>
      {/* ROOM */}
      <div
        style={{
          background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          boxShadow: '0px 4px 0px 0px #0028A140',
        }}
        className="relative w-[110px] cursor-pointer hover:opacity-80 h-[78px] rounded-[10px] pb-[10px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
        <p>他の人の部屋へ</p>
        <p>出かける</p>
        <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
          <ImageRound
            name="Room icon"
            src={'/icons/room-profile.svg'}
            className={`w-fit h-fit `}
          />
        </div>
      </div>
      {/* QUESTION */}
      <div
        style={{
          background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          boxShadow: '0px 4px 0px 0px #0028A140',
        }}
        className="relative w-[110px] cursor-pointer hover:opacity-80 h-[82px] rounded-[10px] pb-[10px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
        <p>アンケート</p>
        <p className="text-[10px] bg-[#FFEE6F] mt-[3px] text-black rounded-full w-[70px] h-5 flex items-center justify-center">
          {' '}
          投票受付中
        </p>
        <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
          <ImageRound
            name="Question icon"
            src={'/icons/question.svg'}
            className={`w-fit h-fit `}
          />
        </div>
      </div>
      {/* MVP */}
      <div
        style={{
          background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          boxShadow: '0px 4px 0px 0px #0028A140',
        }}
        className="relative cursor-pointer hover:opacity-80 w-[110px] h-[82px] rounded-[10px] pb-[10px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
        <p>MVP</p>
        <p className="text-[10px] bg-[#FFEE6F] mt-[3px] text-black rounded-full w-[70px] h-5 flex items-center justify-center">
          {' '}
          投票受付中
        </p>
        <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
          <ImageRound
            name="MVP icon"
            src={'/icons/mvp.svg'}
            className={`w-fit h-fit `}
          />
        </div>
      </div>
      {/* STORE */}
      <div
        style={{
          background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          boxShadow: '0px 4px 0px 0px #0028A140',
        }}
        className="relative cursor-pointer hover:opacity-80 w-[110px] h-[66px] rounded-[10px] pb-[15px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
        <p>アイテム</p>
        <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
          <ImageRound
            name="Shop icon"
            src={'/icons/shop.svg'}
            className={`w-fit h-fit `}
          />
        </div>
      </div>
    </div>
  );
};
