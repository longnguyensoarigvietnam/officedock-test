import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import TextAreaLink from '@components/common/TextAreaLink';

export const EnvelopeForm = ({
  userInfo,
  envelopeMessage,
  remainingQuota,
  setShowEnvelopeContent,
  setEnvelopeMessage,
  setShowConfirmMessage,
  onClose,
}: {
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  };
  envelopeMessage: string;
  remainingQuota:
    | {
        remainingQuota: number;
      }
    | undefined;
  setShowEnvelopeContent: React.Dispatch<React.SetStateAction<boolean>>;
  setEnvelopeMessage: React.Dispatch<React.SetStateAction<string>>;
  setShowConfirmMessage: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}) => {
  const doc = new DOMParser().parseFromString(envelopeMessage, 'text/html');
  const envelopeMessageNumOfChars = doc.body.textContent
    ? doc.body.textContent.trim().length
    : 0;

  return (
    <div className="w-[500px] h-[366px] bg-white rounded-[20px] shadow py-[50px] px-[60px] text-sm">
      <div className="flex items-center justify-center gap-2 w-full">
        <CustomUserAvatar
          avatarUrl={userInfo?.avatar || ''}
          avatarColor={userInfo?.avatarColor || ''}
          size={30}
        />
        <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_40px)] break-all line-clamp-2">
          {userInfo.fullName}
          <span className="text-xs ml-1">さんへ</span>
        </p>
      </div>
      <div className="my-3">
        <p className="text-sm font-medium mb-2">メッセージ</p>
        <TextAreaLink
          className="w-[380px] h-[130px] rounded-[6px] tweet-form"
          onChange={(data) => setEnvelopeMessage && setEnvelopeMessage(data)}
          initialValue={envelopeMessage}
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          className="bg-transparent w-[100px] rounded-[8px] h-[36px] !p-0"
          onClick={onClose}>
          キャンセル
        </Button>
        <Button
          variant="post"
          className={`w-[100px] rounded-[8px] h-[36px]`}
          disabled={
            envelopeMessageNumOfChars == 0 || !remainingQuota?.remainingQuota
          }
          onClick={() => {
            setShowEnvelopeContent(true);
            setShowConfirmMessage(true);
          }}>
          確認する
        </Button>
      </div>
    </div>
  );
};
