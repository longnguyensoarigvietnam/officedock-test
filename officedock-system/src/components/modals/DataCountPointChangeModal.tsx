import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Modal from '@components/common/Modal';
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const DataCountPointChangeModal = ({ open, onClose }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[678px]  text-black overflow-y-auto !rounded-[20px] !py-10 px-[115px]"
      isOutSideAction={false}
      onClose={onClose}>
      <p className="text-center text-[18px] font-medium text-black">
        今月交換可能なコイン数
      </p>
      <p className="text-sm font-normal mt-10 ">
        交換可能なコイン数は、会社の総保有コイン数に応じて毎月変動します
      </p>
      <p className="text-sm font-medium text-primary mt-5">計算内容</p>
      <div className="w-full mt-[10px] py-5 bg-[#EBF1F7] rounded-lg gap-2 flex items-center justify-center text-[22px] text-primary font-medium">
        <p>会社の総保有コイン</p>
        <p className="text-black">÷</p>
        <p>従業員数</p>
      </div>
      <div className="mt-5 rounded-lg border border-[#83919E] p-5 gap-[11px] flex text-sm font-normal">
        <div className="h-full">
          <p>例）</p>
        </div>
        <div className="flex items-end gap-3 flex-shrink-0">
          <div className="w-fit">
            <p>交換可能</p>
            <p>コイン</p>
          </div>
          <div className="flex-shrink-0">
            <ImageRound
              name="demo total coin"
              src={'/images/total-point-count.png'}
              className={`w-fit h-fit`}
            />
          </div>
        </div>
      </div>
      <div className="text-sm font-medium flex items-center mt-5">
        <p>上記例の場合、</p>
        <p className="text-primary">従業員一人当たり100コイン交換</p>
        <p>できます。</p>
      </div>
      <div className="text-sm font-medium text-[#77858F]  mt-3">
        <p>※交換可能なコイン数は翌月に繰り越しません</p>
        <p className="mt-1">
          ※交換可能なコイン数は締め日の次の日に更新されます
        </p>
      </div>
      <div className="mt-10 flex justify-center">
        <Button onClick={onClose} variant="outline" className="w-[128px] h-9">
          閉じる
        </Button>
      </div>
    </Modal>
  );
};

export default DataCountPointChangeModal;
