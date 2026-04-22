import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type WarningChangeHierarchyCategoryModalProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const WarningChangeHierarchyCategoryModal = memo(
  ({ open, onConfirm, onClose }: WarningChangeHierarchyCategoryModalProps) => {

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onClose}
        title="確認">
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">過去のデータもすべて変更されますので注意して変更してください。</p>
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

export default WarningChangeHierarchyCategoryModal;
