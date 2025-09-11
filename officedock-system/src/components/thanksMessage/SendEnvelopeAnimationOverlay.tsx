'use client';

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import Image from 'next/image';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useMutation,
} from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';

import { apiRouters } from '@constants/routers';
import { ERROR_SAVE_MESSAGE } from '@constants/message';

import { useErrorToast } from '@hooks/useErrorToast';

import { EnvelopeBackFlap } from './envelope/EnvelopeBackFlap';
import { EnvelopeBackBody } from './envelope/EnvelopeBackBody';
import { EnvelopeContent } from './envelope/EnvelopeContent';
import { EnvelopeFront } from './envelope/EnvelopeFront';
import { EnvelopeForm } from './envelope/EnvelopeForm';

import api from '@base/api';

interface Props {
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  };
  remainingQuota:
    | {
        remainingQuota: number;
      }
    | undefined;
  onFinish: () => void;
  refetchRemainingQuota: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined,
  ) => Promise<
    QueryObserverResult<
      {
        remainingQuota: number;
      },
      unknown
    >
  >;
}

export default function SendEnvelopeAnimationOverlay({
  userInfo,
  remainingQuota,
  onFinish,
  refetchRemainingQuota,
}: Props) {
  const showErrorToast = useErrorToast();

  const birdRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const backBodyRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [envelopeMessage, setEnvelopeMessage] = useState<string>('');
  const [showEnvelopeContent, setShowEnvelopeContent] =
    useState<boolean>(false);
  const [showFinishMessage, setShowFinishMessage] = useState<boolean>(false);
  const [showConfirmMessage, setShowConfirmMessage] = useState<boolean>(false);

  const playAnimation = () => {
    const birdEl = birdRef.current;
    const envelopeEl = envelopeRef.current;
    if (!birdEl || !envelopeEl) return;

    const tl = gsap.timeline({
      defaults: { duration: 0.8, ease: 'power2.out' },
    });

    const shakeTl = gsap.to(envelopeEl, {
      rotateZ: 10,
      duration: 0.1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      paused: true,
    });

    tl.to(contentRef.current, { y: -100, duration: 2, ease: 'power2.out' })
      .to(contentRef.current, {
        y: 80,
        duration: 0.8,
        ease: 'bounce.out',
        onStart: () => {
          if (contentRef.current) contentRef.current.style.zIndex = '15';
        },
      })
      .to(flapRef.current, {
        rotateX: -180,
        duration: 3,
        transformOrigin: 'bottom center',
        ease: 'power2.inOut',
        onStart: () => {
          if (flapRef.current) {
            flapRef.current.style.zIndex = '40';
          }
        },
        onUpdate: function () {
          const current = this.progress();
          if (current > 0.49 && current < 0.51 && flapRef.current) {
            const path = flapRef.current.querySelector('path');
            if (path) path.setAttribute('fill', '#FF88A0');
          }
        },
      })
      .to(birdEl, {
        x: 50,
        y: 280,
        duration: 1.5,
        ease: 'power2.out',
      })
      .to(
        envelopeEl,
        {
          x: 500,
          y: -window.innerHeight / 2 + 150,
          rotateZ: 40,
          duration: 1.5,
          ease: 'power2.out',
          onStart: () => {
            shakeTl.play();
          },
        },
        '<',
      )
      .to([birdEl, envelopeEl], {
        x: 6000,
        y: -9000,
        opacity: 1,
        duration: 2,
        ease: 'power1.inOut',
        onStart: () => {
          shakeTl.play();
        },
        onComplete: () => {
          shakeTl.pause();
          setShowFinishMessage(true);
        },
      });
  };

  // Call API to send thanks message
  const handleSendThanksMessage = async (data: {
    recipientId: number;
    message: string;
  }) => {
    const { data: response } = await api.post(
      `${apiRouters.THANKS_MESSAGES_LIST}`,
      data,
    );
    return response;
  };

  const { mutateAsync: sendThanksMessage } = useMutation(
    'sendThanksMessage',
    handleSendThanksMessage,
    {
      onSuccess: () => {
        setShowConfirmMessage(false);
        playAnimation();
        refetchRemainingQuota();
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
      },
    },
  );

  return (
    <div className="fixed h-screen inset-0 z-[9999] bg-black bg-opacity-40 flex items-center justify-center">
      {/* Envelope */}
      <div ref={envelopeRef} className="relative w-[620px] h-[360px]">
        <EnvelopeBackFlap ref={flapRef} isSendThanksMsg={true} />
        <EnvelopeBackBody ref={backBodyRef} />

        <div
          ref={contentRef}
          className={`absolute inset-0 z-30 top-[80px] left-[60px] ${!showEnvelopeContent && 'hidden'}`}>
          {showEnvelopeContent && (
            <EnvelopeContent
              content={envelopeMessage}
              userInfo={userInfo}
              isSendThanksMessage={true}
            />
          )}
        </div>
        <div
          ref={formRef}
          className={`absolute inset-0 z-30 top-[30px] left-[60px] ${showEnvelopeContent && 'hidden'}`}>
          {!showEnvelopeContent && (
            <EnvelopeForm
              userInfo={userInfo}
              envelopeMessage={envelopeMessage}
              remainingQuota={remainingQuota}
              setShowEnvelopeContent={setShowEnvelopeContent}
              setEnvelopeMessage={setEnvelopeMessage}
              setShowConfirmMessage={setShowConfirmMessage}
              onClose={onFinish}
            />
          )}
        </div>
        <div ref={frontRef} className="absolute inset-0 z-20 top-[120px]">
          <EnvelopeFront />
        </div>

        {/* Confirm message */}
        <div className="absolute -bottom-[170px] left-1/2 -translate-x-1/2">
          {showConfirmMessage && (
            <div className="w-[675px] bg-white rounded-[10px] pl-5 pr-[6px] py-[6px] flex items-center justify-between">
              <p className="text-sm">
                受け取り側にはこのように表示されます。この内容で送りますか？
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="bg-transparent w-[100px] rounded-[8px] h-[36px] !p-0"
                  onClick={onFinish}>
                  キャンセル
                </Button>
                <Button
                  variant="post"
                  className={`w-[100px] rounded-[8px] h-[36px]`}
                  onClick={async () => {
                    sendThanksMessage({
                      message: envelopeMessage,
                      recipientId: userInfo.id,
                    });
                  }}>
                  送る
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div ref={birdRef} className="absolute top-[-300px] left-[1200px] z-50">
        <div className="relative w-[300px] h-[260px]">
          <Image
            src="/icons/bird.svg"
            alt="Bird"
            fill
            className="object-contain z-50"
          />
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {showFinishMessage && (
          <div className="w-[400px] h-[130px] bg-white rounded-[20px]  flex flex-col gap-[30px] items-center justify-center">
            <p className="text-sm !leading-none">
              サンクスメッセージを送りました
            </p>
            <Button
              variant="text"
              className={`w-[100px] rounded-[8px] !p-0`}
              onClick={onFinish}>
              閉じる
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
