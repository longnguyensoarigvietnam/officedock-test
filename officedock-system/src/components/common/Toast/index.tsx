'use client';
import { Fragment } from 'react';
import { Transition } from '@headlessui/react';

import ImageRound from '../ImageRound';
import { useToast } from '@providers/ToastProvider';
import {
  ERROR_TITLE_MESSAGE,
  SUCCESS_TITLE_MESSAGE,
  WARNING_TITLE_MESSAGE,
} from '@constants/message';

type ToastVariant = 'success' | 'warning' | 'error';
type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ToastProps = {
  show: boolean;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
  fixedToast?: boolean;
  className?: string;
};

const Toast = ({
  show = false,
  title,
  description,
  variant = 'success',
  position = 'top-right',
  fixedToast = true,
  className,
}: ToastProps) => {
  const { hideToast } = useToast();
  let variantIcon = '';
  let variantTitle = '';
  const toastPosition = {
    container: '',
    toast: '',
  };

  switch (variant) {
    case 'error':
      variantTitle = title || ERROR_TITLE_MESSAGE;
      variantIcon = '/icons/error.svg';
      break;
    case 'success':
      variantTitle = title || SUCCESS_TITLE_MESSAGE;
      variantIcon = '/icons/success.svg';
      break;
    case 'warning':
      variantTitle = title || WARNING_TITLE_MESSAGE;
      variantIcon = '/icons/warning.svg';
      break;
  }

  switch (position) {
    case 'bottom-left':
      toastPosition.container = 'items-end';
      toastPosition.toast = 'items-start';
      break;
    case 'bottom-right':
      toastPosition.container = 'items-end';
      toastPosition.toast = 'items-end';
      break;
    case 'top-left':
      toastPosition.container = 'items-start';
      toastPosition.toast = 'items-start';
      break;
    case 'top-right':
      toastPosition.container = 'items-start';
      toastPosition.toast = 'items-end';
      break;
  }

  return (
    <div
      aria-live="assertive"
      className={`pointer-events-none z-40  inset-0 flex px-4 py-6 sm:p-6 ${fixedToast ? 'fixed' : ''} ${toastPosition.container}`}>
      <div className={`flex w-full flex-col space-y-4 ${toastPosition.toast}`}>
        <Transition
          show={show}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="pointer-events-auto overflow-hidden rounded-lg bg-gray-50 shadow-common">
            <div className="p-4">
              <div className={`flex items-start ${className}`}>
                <div className="flex-shrink-0">
                  <ImageRound
                    className="w-12 h-12"
                    src={variantIcon}
                    border="full"
                    name="Toast status icon"
                  />
                </div>
                <div className="ml-3 flex-1 pt-0.5 w-fit min-w-56">
                  <p className="text-lg font-bold text-gray-900">
                    {variantTitle}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => {
                      hideToast();
                    }}>
                    <span className="sr-only">Close</span>
                    <ImageRound
                      className="w-4 h-4"
                      src="/icons/close.svg"
                      name="Cancel toast icon"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default Toast;
