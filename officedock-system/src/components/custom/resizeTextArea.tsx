'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import TextArea from '@components/common/TextArea';
import ImageRound from '@components/common/ImageRound';
import { hasPermissionInArray } from '@utils';
import { PermissionsSystem } from '@constants/enums';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useMutation } from 'react-query';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';
import useDebounceText from '@hooks/useDebounceText';
import { formatDateServer } from '@utils/date';
import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

interface ResizeType {
  currentDate: Date;
  defaultData: string;
  setDefaultData: React.Dispatch<React.SetStateAction<string>>;
}

const ResizeTextArea = ({
  currentDate,
  defaultData,
  setDefaultData,
}: ResizeType) => {
  const textAreaRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);

  const params = useParams();
  const userId = params.id;

  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);
  const { data: session } = useSession();

  const [remarkData, setRemarkData] = useState<string>('');

  useEffect(() => {
    if (defaultData) {
      setRemarkData(defaultData);
    } else {
      setRemarkData('');
    }
  }, [defaultData, currentDate]);
  //  Handle call api edit remark
  const handleEditRemark = async (data: {
    date: string;
    remark?: string;
    isSubmit?: boolean;
  }) => {
    const url = `${apiRouters.CONFIRM_USER_DAILY(parseInt(`${userId}`))}`;

    return await api.post(url, data);
  };
  const { mutate: editRemark } = useMutation(
    'postEditRemark',
    handleEditRemark,
    {
      onSuccess: () => {},
      onError: () => {
        setIsLoading(false);
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {},
    },
  );
  const debouncedSetDescriptionValue = useDebounceText(remarkData, 800);

  useEffect(() => {
    if (
      debouncedSetDescriptionValue &&
      debouncedSetDescriptionValue !== defaultData
    ) {
      editRemark({
        remark: debouncedSetDescriptionValue,
        date: formatDateServer(currentDate),
      });
      setDefaultData(debouncedSetDescriptionValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSetDescriptionValue, editRemark]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = startHeight + (moveEvent.clientY - startY);
      setHeight(newHeight > 50 ? newHeight : 50);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={textAreaRef}
      style={{
        height: `${height}px`,
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      className="py-3 pr-3 ">
      <TextArea
        value={remarkData}
        disabled={
          session?.user.permissions &&
          !hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.STATISTIC_UPDATE,
          )
        }
        onChange={(e) => {
          setRemarkData((e.target as HTMLTextAreaElement).value);
        }}
        onBlur={(e) => {
          const value = (e.target as HTMLTextAreaElement).value;
          if (!value) {
            editRemark({
              remark: '',
              date: formatDateServer(currentDate),
            });
          }
        }}
        placeholder="コメントを書く"
        className="h-full resize-none border !border-[#77858F]"
      />
      {/* Nút resize */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute h-7 w-7 cursor-pointer bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full bg-gray-200">
        <ImageRound
          className="h-5 w-5 object-fill bg-gray-200 rounded-full"
          src="/icons/resizeY.svg"
          name="resize icon"
        />
      </div>
    </div>
  );
};

export default ResizeTextArea;
