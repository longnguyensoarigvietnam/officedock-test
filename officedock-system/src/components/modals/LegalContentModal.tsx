'use client';
import { memo } from 'react';

import Heading from '@components/common/Heading';
import Modal from '../common/Modal';
import Button from '../common/Button';

import { TermsStep } from '@interfaces/user';

import 'react-quill/dist/quill.snow.css';

export type LegalContentModalProps = {
  open: boolean;
  legalContent: TermsStep | null;
  onClose: () => void;
};

const LegalContentModal = memo(
  ({ open, legalContent, onClose }: LegalContentModalProps) => {
    return (
      <Modal
        open={open}
        sz="full"
        className="font-primary bg-white w-full h-[90vh] relative z-[9999999] !rounded-2xl !py-4"
        onClose={() => {}}
        overlayClassName="flex justify-center items-center"
        fixedClass="!z-[50]"
        showIconClose={false}>
        <div className="flex flex-col h-full">
          <header className="flex border-b pb-4  border-solid border-gray-100 justify-between items-center mb-4">
            <Heading
              className="leading-10 !text-[#374151] text-lg min-h-[28px] break-words max-w-full"
              as="h1">
              {legalContent?.title}
            </Heading>
          </header>
          <div className="custom-quill-text text-sm w-full text-gray-700 overflow-y-auto leading-6 text-neutral-02 text-neutral-02 gap-4 flex flex-col justify-between quill-editor ql-editor !p-0">
            <div
              dangerouslySetInnerHTML={{
                __html: legalContent?.description
                  ? `${legalContent?.description}`
                  : '',
              }}></div>
          </div>
          <div className="pt-3">
            <div className="border-t mt-4 pt-4 border-solid border-gray-100 gap-4 flex justify-end">
              <Button
                variant="secondary"
                className={`w-[107px] rounded-xl h-10`}
                onClick={onClose}>
                閉じる
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  },
);

export default LegalContentModal;
