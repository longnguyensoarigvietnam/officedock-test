import { memo, useState } from 'react';

import TextArea from '@components/common/TextArea';
import Modal from '../common/Modal';
import Button from '../common/Button';

import { MAX_TWEET_MESSAGE_LENGTH } from '@constants';

export type ConfirmActionsEventModalProps = {
  open: boolean;
  tweetMessage: string;
  setTweetMessage?: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSubmit: () => void;
};

const CreateTweetModal = memo(
  ({
    open,
    tweetMessage,
    setTweetMessage,
    onClose,
    onSubmit,
  }: ConfirmActionsEventModalProps) => {
    const [isTweetSubmitted, setIsTweetSubmitted] = useState<boolean>(false);
    const disableSubmitButton =
      tweetMessage.trim().length > MAX_TWEET_MESSAGE_LENGTH;

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className={`font-primary bg-white ${isTweetSubmitted ? 'w-[400px]' : 'w-[500px]'} !rounded-[14px] py-5`}
        onClose={() => {}}>
        {isTweetSubmitted ? (
          <div className="flex flex-col items-center space-y-3">
            <p className="text-sm">つぶやきました</p>
            <Button variant="text" className="pb-0" onClick={onClose}>
              閉じる
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-8">
            <div className="space-y-2">
              <p className="font-medium text-[18px] text-black">
                いまの気持ちをつぶやきましょう
              </p>
              <p className="text-[#77858F] text-sm font-medium">
                ※つぶやきはタイムラインに表示されます
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium">つぶやき</p>
              <TextArea
                className="!border-[#77858F] resize-none !h-[130px] !w-[440px]"
                onChange={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (setTweetMessage) {
                    setTweetMessage(target.value);
                  }
                }}
              />
              <p
                className={`flex justify-end text-[13px] ${disableSubmitButton && 'text-[#EC2950]'}`}>
                {tweetMessage.trim().length}/{MAX_TWEET_MESSAGE_LENGTH}字
              </p>
            </div>
            <div className="gap-4 flex justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className={`w-[100px] rounded-[8px] h-[36px] !p-0`}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                disabled={
                  disableSubmitButton || tweetMessage.trim().length == 0
                }
                onClick={() => {
                  setIsTweetSubmitted(true);
                  onSubmit();
                }}
                className={`w-[100px] rounded-[8px] h-[36px]`}
                style={{
                  background: 'linear-gradient(to bottom, #355AC9, #5282FC)',
                }}>
                つぶやく
              </Button>
            </div>
          </div>
        )}
      </Modal>
    );
  },
);

export default CreateTweetModal;
