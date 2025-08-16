import { memo, useState } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import TextAreaLink from '@components/common/TextAreaLink';

import { MAX_TWEET_MESSAGE_LENGTH } from '@constants';

export type ConfirmActionsEventModalProps = {
  open: boolean;
  tweetMessage: string;
  isSendTweetSuccess: boolean;
  setTweetMessage?: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSubmit: () => void;
};

const CreateTweetModal = memo(
  ({
    open,
    tweetMessage,
    isSendTweetSuccess,
    setTweetMessage,
    onClose,
    onSubmit,
  }: ConfirmActionsEventModalProps) => {
    const [isTweetSubmitted, setIsTweetSubmitted] = useState<boolean>(false);
    const doc = new DOMParser().parseFromString(tweetMessage, 'text/html');
    const tweetMessageNumOfChars = doc.body.textContent
      ? doc.body.textContent.trim().length
      : 0;

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className={`font-primary bg-white ${isTweetSubmitted && isSendTweetSuccess ? 'w-[400px]' : 'w-[500px]'} !rounded-[14px] py-5`}
        onClose={() => {}}>
        {isTweetSubmitted && isSendTweetSuccess ? (
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
              <TextAreaLink
                className="!border-[#77858F] resize-none !h-[130px] !w-[440px] tweet-form"
                onChange={(data) => setTweetMessage && setTweetMessage(data)}
                initialValue={tweetMessage}
              />
              <p
                className={`flex justify-end text-[13px] ${tweetMessageNumOfChars == 0 || (tweetMessageNumOfChars > MAX_TWEET_MESSAGE_LENGTH && 'text-[#EC2950]')}`}>
                {tweetMessageNumOfChars}/{MAX_TWEET_MESSAGE_LENGTH}字
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
                  tweetMessageNumOfChars == 0 ||
                  tweetMessageNumOfChars > MAX_TWEET_MESSAGE_LENGTH
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
