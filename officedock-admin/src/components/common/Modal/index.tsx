import React, { Fragment } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from '@headlessui/react';

import Heading from '../Heading';

export type ModalSize = 'sm' | 'lg' | 'xl';

export type ModalProps = {
  open: boolean;
  sz?: ModalSize;
  title?: string;
  content?: string;
  className?: string;
  children?: React.ReactNode;
  onClose: () => void;
};

const Modal = ({
  open,
  sz = 'sm',
  title,
  children,
  className,
  onClose,
}: ModalProps) => {
  const sizeClass = {
    sm: 'w-[515px] !rounded-2xl',
    lg: 'w-[1221px]',
    xl: 'w-[1386px]',
  }[sz];
  const sizePadding = {
    sm: 'py-[23px]',
    lg: 'py-[60px]',
    xl: 'py-[60px]',
  }[sz];
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-30" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div
            className={`flex min-h-full items-center justify-center text-center m-auto ${sizeClass}`}>
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel
                className={`relative transform rounded-lg ${sizeClass} bg-white text-left shadow-xl transition-all m-24`}>
                <div
                  className={` ${sizePadding} px-4 font-primary ${className}`}>
                  {title && (
                    <header className="flex  border-b pb-4  border-solid border-gray-100 justify-between items-center mb-4">
                      <Heading
                        className="leading-10 !text-[#374151] text-lg"
                        as="h1">
                        {title}
                      </Heading>
                      <Image
                        className="mt-1 hover:cursor-pointer"
                        src="/icons/close.svg"
                        alt="Close modal"
                        width={18}
                        height={18}
                        onClick={onClose}
                      />
                    </header>
                  )}
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
