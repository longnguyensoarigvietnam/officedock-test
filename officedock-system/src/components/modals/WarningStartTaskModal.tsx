import { memo, useContext } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { ItemStartType } from '@constants/enums';
import { TaskContext } from '@providers/TaskProvider';

export type WarningStartTaskModalProps = {
  open: boolean;
  type: string;
  onConfirm: () => void;
  onClose: () => void;
};

const WarningStartTaskModal = memo(
  ({ open, type, onConfirm, onClose }: WarningStartTaskModalProps) => {
    const { dataClickTask } = useContext(TaskContext);

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onClose}
        title="確認">
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">{`既に計測中の${type}があります。計測中の${type}計測を停止して、選択した${dataClickTask.type === ItemStartType.TASK ? 'タスク' : '予定'}計測を開始しますか。`}</p>
        </div>
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-transparent w-[107px] rounded-xl h-10">
            いいえ
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`w-[107px] rounded-xl h-10`}>
            はい
          </Button>
        </div>
      </Modal>
    );
  },
);

export default WarningStartTaskModal;
