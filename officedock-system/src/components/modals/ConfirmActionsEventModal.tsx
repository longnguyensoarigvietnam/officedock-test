import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { EventEditFormData, EventFormData } from '@interfaces/calendar';
import TextArea from '@components/common/TextArea';
import { ActionsEvent } from '@constants/enums';

export type ConfirmActionsEventModalProps = {
  open: boolean;
  type: string;
  setActionsEventMessage?: React.Dispatch<React.SetStateAction<string>>;
  onSend: (data: EventEditFormData | EventFormData) => void;
  onRejectSend: (data: EventEditFormData | EventFormData) => void;
  onClose: () => void;
  onBackToEditModal: () => void;
};

const ConfirmActionsEventModal = memo(
  ({
    open,
    type,
    setActionsEventMessage,
    onSend,
    onRejectSend,
    onClose,
    onBackToEditModal,
  }: ConfirmActionsEventModalProps) => {
    let modalTitle = '';
    let modalContent = '';
    switch (type) {
      case ActionsEvent.CREATE:
        modalTitle = '新規作成確認';
        modalContent = 'カレンダーの参加者に招待チャットを送信しますか？';
        break;
      case ActionsEvent.EDIT:
        modalTitle = '編集確認';
        modalContent = '変更内容をカレンダーの参加者にチャットで送信しますか？';
        break;
      case ActionsEvent.DELETE:
        modalTitle = '削除確認';
        modalContent =
          '予定を削除する旨をカレンダーの参加者にチャットで送信しますか？';
        break;
      default:
        break;
    }

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onClose}
        title={modalTitle}>
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">{modalContent}</p>
        </div>
        {(type == ActionsEvent.EDIT || type == ActionsEvent.DELETE) && (
          <div className="mt-3">
            <TextArea
              placeholder="参加者宛にメッセージを追加（省略可)"
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                if (setActionsEventMessage) {
                  setActionsEventMessage(target.value);
                }
              }}
            />
          </div>
        )}
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={onBackToEditModal}
            className="bg-transparent w-[107px] rounded-xl h-10">
            編集に戻る
          </Button>
          <Button
            variant="outline"
            disabled={!open}
            onClick={onRejectSend}
            className={`w-[107px] rounded-xl h-10`}>
            送信しない
          </Button>
          <Button
            variant="primary"
            disabled={!open}
            onClick={onSend}
            className={`w-[107px] rounded-xl h-10`}>
            送信
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmActionsEventModal;
