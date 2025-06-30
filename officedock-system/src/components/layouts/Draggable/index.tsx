'use client';
import { useSessionCache } from '@providers/SessionCacheProvider';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Rnd, RndDragCallback, RndResizeCallback } from 'react-rnd';
import { SubmitHandler, useForm } from 'react-hook-form';
import { usePathname } from 'next/navigation';
import { useMutation } from 'react-query';

import TextArea from '@components/common/TextArea';
import { ERROR_CREATE_MESSAGE } from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { SessionStatus } from '@constants/enums';
import useMemoDetail from '@hooks/useDetailMemo';
import { MemoDetailData } from '@interfaces/user';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';

const DraggableLayout = () => {
  const { data: session, status } = useSessionCache();

  const pathname = usePathname();

  const { showToast } = useToast();

  const [hasSession, setHasSession] = useState(false);
  const [isShow, setShow] = useState<boolean>(true);
  const [initialContent, setInitialContent] = useState<string>('');

  const { memoDetail } = useMemoDetail({ conditions: [pathname.length > 1] });

  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth - 600,
    y: 50,
  });
  const [positionBtn, setPositionBtn] = useState<{ x: number; y: number }>({
    x: window.innerWidth - 49,
    y: window.innerHeight - 40,
  });
  const [size, setSize] = useState({
    width: 180,
    height: 120,
  });

  const { register, watch, reset } = useForm<MemoDetailData>({
    mode: 'onSubmit',
    defaultValues: {
      content: '',
    },
  });

  const defaultValues = useMemo<MemoDetailData>(() => {
    const value: MemoDetailData = {
      content: '',
      isOpen: false,
    };

    if (memoDetail) {
      value.content = memoDetail.content;
      setInitialContent(memoDetail.content);
      setShow(memoDetail.isOpen as boolean);
    }

    return value;
  }, [memoDetail]);

  // Update default value
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (status === SessionStatus.AUTHENTICATED && session && session.user) {
      setTimeout(() => {
        setHasSession(true);
      }, 1200);
    } else {
      setHasSession(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const handleBack = () => {
    setShow(false);
    onSubmit({
      content: watch('content'),
      isOpen: false,
    });
  };

  const handleShow = () => {
    setShow(true);
    onSubmit({
      content: watch('content'),
      isOpen: true,
    });
  };

  const handleDragStop: RndDragCallback = (e, d) => {
    setPosition({ x: d.x - 18, y: d.y });
  };
  const handleResizeStop: RndResizeCallback = (
    e,
    direction,
    ref,
    delta,
    position,
  ) => {
    setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
    setPosition(position);
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      if (window.innerWidth < 1440) {
        setPositionBtn({
          x: window.innerWidth - 49,
          y: window.innerHeight - 45,
        });
      } else {
        setPositionBtn({
          x: window.innerWidth - 49,
          y: window.innerHeight - 40,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  //Function call api create memo
  const handleCreateMemo = async (data: MemoDetailData) => {
    return await api.post(apiRouters.MEMO_DETAIL, data);
  };

  const { mutate: createMemo } = useMutation(
    'postCreateMemo',
    handleCreateMemo,
    {
      onSuccess: () => {},
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_CREATE_MESSAGE,
        });
      },
      onSettled: () => {},
    },
  );
  const onSubmit: SubmitHandler<MemoDetailData> = (data) => {
    createMemo(data);
  };

  const isResetPasswordPage =
    pathname === pageRouters.LOGIN.href ||
    pathname === pageRouters.RESET_PASSWORD.href;

  return (
    <>
      {memoDetail &&
        hasSession &&
        pathname.length > 1 &&
        !isResetPasswordPage && (
          <>
            {!isShow ? (
              <Rnd
                default={{
                  x: window.innerWidth - 49,
                  y: window.innerHeight - 50,
                  width: 46,
                  height: 40,
                }}
                size={{
                  width: 46,
                  height: 40,
                }}
                position={positionBtn}
                disableDragging={true}
                enableResizing={false}
                className="w-full h-full z-20">
                <div
                  onClick={() => handleShow()}
                  className="w-[46px] h-10 bg-[#0068B7] flex items-center justify-center cursor-pointer  rounded-tl-[10px]">
                  <Image
                    className="w-3 h-3  hover:cursor-pointer hover:opacity-70"
                    src="/icons/edit-popup-draggable.svg"
                    alt="Close modal"
                    width={20}
                    height={20}
                  />
                </div>
              </Rnd>
            ) : (
              <Rnd
                position={position}
                size={size}
                minWidth={180}
                minHeight={120}
                bounds="parent"
                disableDragging={false}
                onDragStop={handleDragStop}
                onResizeStop={handleResizeStop}
                enableResizing={{
                  top: true,
                  right: true,
                  bottom: true,
                  left: true,
                  topRight: true,
                  bottomRight: true,
                  bottomLeft: true,
                  topLeft: true,
                }}
                className={`z-[9999] ${hasSession ? 'absolute' : 'hidden'} `}>
                <div
                  className={`font-primary bg-[#EAF8FF] flex flex-col justify-between h-full w-full  cursor-pointer rounded-sm rounded-br-[15px] shadow-common z-[9999]  pt-2`}>
                  <div className="px-2 w-full h-full">
                    <div className="flex justify-between items-center">
                      <p className="text-[#0068B6] text-[10px] font-normal">
                        memo
                      </p>
                      <Image
                        className="hover:cursor-pointer hover:opacity-70"
                        src="/icons/zoom-out.svg"
                        alt="Close modal"
                        width={15}
                        height={15}
                        onClick={() => handleBack()}
                      />
                    </div>
                    <div className="px-[6px] w-full h-[calc(100%_-_19px)]">
                      <TextArea
                        register={register('content', {
                          onBlur: (e) => {
                            if (e.target.value !== initialContent) {
                              setInitialContent(e.target.value);
                              onSubmit({
                                content: e.target.value,
                                isOpen: isShow,
                              });
                            }
                          },
                        })}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        className=" !resize-none !h-full !px-0  !py-0 bg-transparent shadow-none border-none !focus:shadow-none !focus:border-none  w-full mt-[11px] text-[13px] font-normal  leading-[19px]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#D1EAF7] w-[10px] h-[10px] rounded-sm rounded-br-[25px]"></div>
                  </div>
                </div>
              </Rnd>
            )}
          </>
        )}
    </>
  );
};

export default DraggableLayout;
