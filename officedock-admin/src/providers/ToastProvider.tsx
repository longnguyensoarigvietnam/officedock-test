'use client';
import { ReactNode, createContext, useContext, useState } from 'react';

import Toast, { ToastProps } from '@components/common/Toast';
import { TOAST_DURATION } from '@constants';

type ToastContextType = {
  showToast: (toast?: Omit<ToastProps, 'show'>) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export const useToast = () => {
  const context = useContext(ToastContext);
  return context;
};

let timeoutId: NodeJS.Timeout | null = null;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastProps>({
    show: false,
    title: '',
    description: '',
    variant: 'success',
    duration: TOAST_DURATION,
    position: 'top-right',
    className: '',
  });

  const showToast = ({
    title,
    description,
    variant,
    duration,
    position,
    className,
  }: Omit<ToastProps, 'show'> = {}) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    setToast({
      show: true,
      title,
      description,
      variant,
      duration,
      position,
      className,
    });
    timeoutId = setTimeout(() => {
      hideToast();
    }, TOAST_DURATION);
  };

  const hideToast = () => {
    setToast((prevToast) => ({
      ...prevToast,
      show: false,
    }));
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast {...toast} />
    </ToastContext.Provider>
  );
};
