import { Dispatch, memo, SetStateAction } from 'react';

import RadioButton from '@components/common/RadioButton';

import Modal from '../common/Modal';
import Button from '../common/Button';

import { ActionsEvent, EventActionType } from '@constants/enums';

export type EventActionTypeModalProps = {
  open: boolean;
  eventActionType: EventActionType | null;
  openEventActionTypeModal: {
    status: boolean;
    type: ActionsEvent | null;
    showThisEventOption?: boolean;
  };
  setEventActionType: Dispatch<SetStateAction<EventActionType | null>>;
  onCancel: () => void;
  onConfirm: () => void;
};

const EventActionTypeModal = memo(
  ({
    open,
    eventActionType,
    openEventActionTypeModal,
    setEventActionType,
    onCancel,
    onConfirm,
  }: EventActionTypeModalProps) => {
    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary bg-white w-[330px] !rounded-2xl py-4"
        onClose={onCancel}
        title={`定期的な予定の${openEventActionTypeModal.type == ActionsEvent.EDIT ? '編集' : '削除'}`}>
        <div className="space-y-4">
          {openEventActionTypeModal.showThisEventOption && (
            <RadioButton
              name="type"
              label="この予定"
              classLabel="font-normal"
              onChange={() => setEventActionType(EventActionType.THIS_EVENT)}
              isChecked={eventActionType == EventActionType.THIS_EVENT}
            />
          )}
          <RadioButton
            name="type"
            label="これ以降のすべての予定"
            classLabel="font-normal"
            onChange={() =>
              setEventActionType(EventActionType.THIS_AND_FOLLOWING_EVENTS)
            }
            isChecked={
              eventActionType == EventActionType.THIS_AND_FOLLOWING_EVENTS
            }
          />
          <RadioButton
            name="type"
            label="すべての予定"
            classLabel="font-normal"
            onChange={() => setEventActionType(EventActionType.ALL_EVENTS)}
            isChecked={eventActionType == EventActionType.ALL_EVENTS}
          />
        </div>
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className={`w-[107px] rounded-xl h-10`}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`w-[107px] rounded-xl h-10`}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default EventActionTypeModal;
