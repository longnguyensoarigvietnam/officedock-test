'use client';
import { ChangeEvent, memo, useRef } from 'react';

import Modal from '../common/Modal';
import Button from '@components/common/Button';

export type ChatDroppingFileModalProps = {
  open: boolean;
  onDropFile: (e: React.DragEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onUploadFile: (e: ChangeEvent<HTMLInputElement>) => void;
};

const ChatDroppingFileModal = memo(
  ({ open, onDropFile, onClose, onUploadFile }: ChatDroppingFileModalProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    return (
      <Modal
        open={open}
        className="font-primary !rounded-xl text-gray-700 !p-0 w-[600px] h-[400px]"
        contentClass="!w-[600px]"
        onClose={() => {
          onClose();
        }}>
        <div
          className="w-full h-full p-3"
          onDragOver={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onDrop={onDropFile}>
          <div
            className="w-full h-full rounded-[6px] flex flex-col justify-center gap-5 items-center"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='11' ry='11' stroke='%23C2CFD7' stroke-width='2' stroke-dasharray='4' stroke-dashoffset='33' stroke-linecap='square'/%3E%3C/svg%3E")`,
              borderRadius: '11px',
            }}>
            <p className="text-sm text-[#5B6770] font-medium leading-none">
              アップロードするファイルをここにドロップ
            </p>
            <p className="text-sm text-[#5B6770] font-medium leading-none">または</p>
            <Button
              variant="secondary"
              className="text-white font-medium !text-xs !bg-[#77858F] !w-[104px] !p-0 !h-[30px] !rounded-[4px]"
              onClick={() => {
                fileInputRef.current?.click();
              }}>
              ファイルを選択
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                onUploadFile(e);
              }}
            />
          </div>
        </div>
      </Modal>
    );
  },
);

export default ChatDroppingFileModal;
