import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { LevelUpAction } from '@constants/enums';

export type LevelUpInfoModalProps = {
  open: boolean;
  skillName: string;
  levelUpInfo: string[];
  triggerAction: string;
  onSubmit?: () => void;
  onClose: () => void;
};

const LevelUpInfoModal = memo(
  ({
    open,
    skillName,
    levelUpInfo,
    triggerAction,
    onSubmit,
    onClose,
  }: LevelUpInfoModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-2xl py-4"
        onClose={onClose}
        title="スキルマップ">
        <div className="text-sm text-gray-700">
          <div className="mb-3 bg-[#EBF1F4] pl-2 py-2 rounded-md">
            <p className="font-medium !break-words min-h-6 text-center text-[16px]">
              {skillName}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-3">のレベルアップ申請を行いますか?</p>
          <ul className="bg-[#EAF8FF] px-5 pb-5 pt-2 rounded-md">
            <p className="text-center font-semibold">Check!</p>
            {levelUpInfo.map((info, index) => {
              return (
                <li className="list-disc ml-5 break-words" key={index}>
                  {info}
                </li>
              );
            })}
          </ul>
        </div>
        {triggerAction == LevelUpAction.EDIT && (
          <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              className="bg-transparent w-[107px] rounded-xl h-10">
              申請しない
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              className={`w-[107px] rounded-xl h-10`}>
              申請する
            </Button>
          </div>
        )}
      </Modal>
    );
  },
);

export default LevelUpInfoModal;
