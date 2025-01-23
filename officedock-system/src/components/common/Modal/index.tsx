import { Fragment } from 'react';
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from '@headlessui/react';

import Heading from '../Heading';
import ImageRound from '../ImageRound';

export type ModalSize = 'sm' | 'lg' | 'xl' | 'full';

export type ModalProps = {
  open: boolean;
  title?: string;
  sz?: ModalSize;
  isOutSideAction?: boolean;
  className?: string;
  overlayClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeIconClassName?: string;
  closeClassName?: string;
  children?: React.ReactNode;
  showIconClose?: boolean;
  onClose: () => void;
};

const Modal = ({
  open,
  title,
  sz = 'sm',
  isOutSideAction = true,
  className,
  overlayClassName,
  headerClassName,
  titleClassName,
  closeIconClassName,
  closeClassName,
  children,
  showIconClose = true,
  onClose,
}: ModalProps) => {
  const sizeClass = {
    sm: 'w-[515px] !rounded-2xl',
    lg: 'w-[1221px]',
    xl: 'w-[1386px]',
    full: 'w-[95vw] !m-5 h-[90vh] !min-h-[90vh]',
  }[sz];

  const sizePadding = {
    sm: 'py-[23px]',
    lg: 'py-[60px]',
    xl: 'py-[60px]',
    full: 'py-0',
  }[sz];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-30"
        onClose={() => {
          if (isOutSideAction) {
            onClose();
          }
        }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-[15%] transition-opacity" />
        </TransitionChild>

        <div
          className={`fixed inset-0 z-30 overflow-y-auto ${overlayClassName}`}>
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
                    <header
                      className={`flex  border-b pb-4  border-solid border-gray-100 justify-between items-center mb-4 ${headerClassName}`}>
                      <Heading
                        className={`leading-10 !text-[#374151] text-lg truncate ${titleClassName}`}
                        as="h1">
                        {title}
                      </Heading>
                      {showIconClose && (
                        <div className={`${closeIconClassName}`}>
                          <ImageRound
                            className={`mt-1 w-5 h-5 hover:cursor-pointer ${closeClassName}`}
                            src="/icons/close.svg"
                            name="Close modal"
                            onClick={onClose}
                          />
                        </div>
                      )}
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
