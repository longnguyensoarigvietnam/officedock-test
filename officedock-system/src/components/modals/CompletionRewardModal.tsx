import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import ImageRound from '@components/common/ImageRound';

import { SkillMapTypeInterval } from '@constants/enums';

import { WebSocketMessageData } from '@interfaces/chat';

export type CompletionRewardModalProps = {
  open: boolean;
  dataRewardSkill?: WebSocketMessageData;
  onConfirm: () => void;
  onClose: () => void;
};

const CompletionRewardModal = memo(
  ({
    open,
    dataRewardSkill,
    onConfirm,
    onClose,
  }: CompletionRewardModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-lg  py-10"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="flex justify-center">
          <ImageRound
            src={'/icons/success.svg'}
            name={'success'}
            className="w-10 h-10"
          />
        </div>
        <div className="font-medium text-[18px] text-[#0068B6] text-center my-[30px] ">
          「{dataRewardSkill?.skill.name}」を{' '}
          {dataRewardSkill?.measureCount !== null && (
            <>{dataRewardSkill?.measureCount}回完了しました！</>
          )}
          {dataRewardSkill?.measureTime !== null && (
            <>
              {dataRewardSkill?.measureTime}
              時間経過した
            </>
          )}
          {dataRewardSkill?.lookBackInterval !== null && (
            <>
              {dataRewardSkill?.lookBackInterval}
              {
                SkillMapTypeInterval[
                  dataRewardSkill?.lookBackType as keyof typeof SkillMapTypeInterval
                ]
              }
            </>
          )}
        </div>
        <div className="text-sm font-normal text-center mb-[30px]">
          <p>あなたの成長を確認できる</p>
          <p>スキルマップを見に行きませんか？</p>
        </div>
        <div className="flex justify-center mb-5">
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[182px] h-[36px] !px-0 flex justify-center`}>
            スキルマップを見に行く
          </Button>
        </div>

        <div className="text-center">
          <p className="text-[#0068B6] text-[13px] font-medium cursor-pointer">
            今はやめておく
          </p>
        </div>
      </Modal>
    );
  },
);

export default CompletionRewardModal;
