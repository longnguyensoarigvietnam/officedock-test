'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Image from 'next/image';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import { TwinklingIcon } from '@components/common/TwinklingIcon';
import ImageRound from '@components/common/ImageRound';

import { ThanksMessageDetail } from '@interfaces/thanks-message';

import { apiRouters } from '@constants/routers';

import { EnvelopeBackFlap } from './envelope/EnvelopeBackFlap';
import { EnvelopeBackBody } from './envelope/EnvelopeBackBody';
import { EnvelopeContent } from './envelope/EnvelopeContent';
import { EnvelopeFront } from './envelope/EnvelopeFront';

import api from '@base/api';

interface Props {
  receivedThanksMessageList: ThanksMessageDetail[];
  onFinish: () => void;
  onNavigateToThanksMessageList: () => void;
  setReceivedThanksMessageList: React.Dispatch<
    React.SetStateAction<ThanksMessageDetail[]>
  >;
}

export default function ReceiveEnvelopeAnimationOverlay({
  receivedThanksMessageList,
  onFinish,
  onNavigateToThanksMessageList,
  setReceivedThanksMessageList,
}: Props) {
  const [showConfirmMessage, setShowConfirmMessage] = useState<boolean>(false);
  const [showTwinklingStars, setShowTwinklingStars] = useState<boolean>(false);

  const birdRef = useRef<HTMLDivElement>(null);
  const envelopeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frontRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backBodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const readIdsRef = useRef<Set<number>>(new Set());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showReadMessage, setShowReadMessage] = useState<{
    show: boolean;
    index: number;
  }>({
    show: false,
    index: 0,
  });

  const animateEnvelopeOpen = (
    flapEl: HTMLElement | null,
    contentEl: HTMLElement | null,
    onComplete?: () => void,
  ) => {
    const tl = gsap.timeline({
      defaults: { duration: 0.8, ease: 'power2.out' },
    });

    tl.to(flapEl, {
      rotateX: 180,
      duration: 1.5,
      transformOrigin: 'bottom center',
      ease: 'power2.inOut',
      onUpdate: function () {
        const current = this.progress();
        if (current > 0.49 && current < 0.51 && flapEl) {
          flapEl.style.zIndex = '30';
          const path = flapEl.querySelector('path');
          if (path) path.setAttribute('fill', '#F86683');
        }
      },
    })
      .to(contentEl, {
        y: -150,
        duration: 1.5,
        ease: 'power2.out',
        onStart: () => {
          if (contentEl) contentEl.style.zIndex = '30';
        },
      })
      .to(contentEl, {
        y: -110,
        duration: 0.8,
        ease: 'bounce.out',
        onStart: () => {
          if (contentEl) contentEl.style.zIndex = '45';
        },
        onComplete,
      });

    return tl;
  };

  const playAnimation = (index: number) => {
    const birdEl = birdRef.current;
    const envelopeEl = envelopeRefs.current[index];
    const flapEl = flapRefs.current[index];
    const contentEl = contentRefs.current[index];
    if (!birdEl || !envelopeEl) return;

    safeReadThanksMessage(receivedThanksMessageList[index].id);

    gsap.set(envelopeEl, { x: window.innerWidth * 1.5, y: -window.innerHeight, opacity: 0 });
    gsap.set(birdEl, { x: window.innerWidth * 1.5, y: -window.innerHeight, opacity: 0 });

    const tl = gsap.timeline({
      defaults: { duration: 0.8, ease: 'power2.out' },
    });

    tl.to([birdEl, envelopeEl], {
      x: window.innerWidth * 0.1,
      y: -window.innerHeight * 0.5,
      opacity: 1,
      duration: 1.5,
      ease: 'power1.inOut',
    })
      .to(birdEl, {
        x: window.innerWidth,
        y: -window.innerHeight,
        duration: 1.5,
        ease: 'power1.inOut',
      })
      .to(
        envelopeEl,
        {
          x: 0,
          y: 0,
          duration: 1.5,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(envelopeEl, {
              rotateZ: 0,
              duration: 0.2,
              ease: 'power1.out',
            });
            setShowAll(true);
          },
        },
        '<',
      )
      .add(
        animateEnvelopeOpen(flapEl, contentEl, () => {
          setShowConfirmMessage(true);
          setShowTwinklingStars(true);
        }),
      );
  };

  const playOpenEnvelopeAnimation = (index: number) => {
    const envelopeEl = envelopeRefs.current[index];
    const flapEl = flapRefs.current[index];
    const contentEl = contentRefs.current[index];
    if (!envelopeEl) return;

    setIsAnimating(true);
    safeReadThanksMessage(receivedThanksMessageList[index].id);

    animateEnvelopeOpen(flapEl, contentEl, () => {
      setShowConfirmMessage(true);
      setShowTwinklingStars(true);
    });
  };

  useEffect(() => {
    playAnimation(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNextEnvelope = () => {
    setShowTwinklingStars(false);

    const envelopeEl = envelopeRefs.current[currentIndex];
    if (!envelopeEl) return;
    if (showReadMessage.show && showReadMessage.index < currentIndex) {
      setShowReadMessage({
        show: true,
        index: showReadMessage.index + 1,
      });
    } else {
      const tl = gsap.timeline({
        defaults: { duration: 0.8, ease: 'power2.out' },
      });

      tl.to(envelopeEl, {
        x: -2000,
        duration: 1.5,
        ease: 'bounce.out',
        onStart: () => {
          if (envelopeEl) envelopeEl.style.display = 'block';
        },
      });
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setShowReadMessage({
        show: false,
        index: nextIndex,
      });
      !receivedThanksMessageList[nextIndex]?.isRead &&
        playOpenEnvelopeAnimation(nextIndex);
    }
  };

  const onPrevEnvelope = () => {
    setShowTwinklingStars(false);

    const prevIndex = Number(showReadMessage.index) - 1;
    if (prevIndex < 0) return;

    const envelopeEl = envelopeRefs.current[prevIndex];
    if (!envelopeEl) return;

    setShowReadMessage({
      show: true,
      index: prevIndex,
    });
  };

  const safeReadThanksMessage = (id: number) => {
    if (!readIdsRef.current.has(id)) {
      readIdsRef.current.add(id);
      readThanksMessage({ ids: [id] });
    }
  };

  // Call API to read thanks message
  const handleReadThanksMessage = async (data: { ids: number[] }) => {
    const { data: response } = await api.post(
      apiRouters.READ_THANKS_MESSAGE,
      data,
    );
    return response;
  };

  const { mutate: readThanksMessage } = useMutation(
    'readThanksMessage',
    handleReadThanksMessage,
    {
      onSuccess: (_data, variables) => {
        setIsAnimating(false);
        setReceivedThanksMessageList((prev) =>
          prev.map((message) => {
            if (variables.ids.includes(message.id)) {
              return {
                ...message,
                isRead: true,
              };
            }
            return { ...message };
          }),
        );
      },
      onError: () => {},
    },
  );

  return (
    <div className="fixed h-screen inset-0 z-[9999] bg-black bg-opacity-40 flex items-center justify-center">
      {receivedThanksMessageList.map((env, idx) => {
        const isVisible = idx >= currentIndex && idx <= currentIndex + 2;
        const relativePos = idx - currentIndex;
        const brightness = Math.max(0.5, 1 - relativePos * 0.15);
        return (
          <div
            key={env.id}
            ref={(el) => {
              if (el) envelopeRefs.current[idx] = el;
            }}
            className={`absolute w-[620px] h-[360px] ${!showAll && idx != 0 ? 'hidden' : !isVisible ? 'hidden' : ''}`}
            style={{
              transform: `translate(${idx * 8}px, ${idx * -8}px)`,
              zIndex: receivedThanksMessageList.length - idx,
              filter: `brightness(${brightness})`,
            }}
            onClick={() => {
              if (
                isAnimating ||
                (showReadMessage.show
                  ? showReadMessage.index ==
                    receivedThanksMessageList.length - 1
                  : currentIndex == receivedThanksMessageList.length - 1) ||
                (showReadMessage.show
                  ? showReadMessage.index == idx
                  : idx == currentIndex)
              )
                return;
              onNextEnvelope();
            }}>
            <EnvelopeBackFlap
              ref={(el) => {
                if (el) flapRefs.current[idx] = el;
              }}
            />
            <EnvelopeBackBody
              ref={(el) => {
                if (el) backBodyRefs.current[idx] = el;
              }}
            />

            <div
              ref={(el) => {
                if (el) contentRefs.current[idx] = el;
              }}
              className="absolute inset-0 z-20 top-[150px] left-[60px]">
              <EnvelopeContent
                content={
                  showReadMessage.show
                    ? receivedThanksMessageList[showReadMessage.index as number]
                        .message
                    : env.message
                }
                userInfo={
                  showReadMessage.show
                    ? receivedThanksMessageList[showReadMessage.index as number]
                        .sender
                    : env.sender
                }
                isSendThanksMessage={false}
              />
            </div>
            <div
              ref={(el) => {
                if (el) frontRefs.current[idx] = el;
              }}
              className="absolute inset-0 z-30 top-[120px]">
              <EnvelopeFront />
            </div>
            {idx === currentIndex && showTwinklingStars && (
              <div>
                <TwinklingIcon
                  className="absolute top-[60px] left-[-55px] w-[44px] h-[40px] z-[100]"
                  delay={0}
                  iconUrl="/icons/twinkling-heart.svg"
                />
                <TwinklingIcon
                  className="absolute top-[-50px] right-[5px] w-[44px] h-[40px] z-[100]"
                  delay={0.8}
                  iconUrl="/icons/twinkling-heart.svg"
                />
                <TwinklingIcon
                  className="absolute bottom-[-50px] left-[-35px] w-[44px] h-[40px] z-[100]"
                  delay={1}
                  iconUrl="/icons/twinkling-heart.svg"
                />
                <TwinklingIcon
                  className="absolute bottom-[-110px] left-[45px] w-[44px] h-[40px] z-[100]"
                  delay={1.2}
                  iconUrl="/icons/twinkling-heart.svg"
                />
                <TwinklingIcon
                  className="absolute bottom-[0px] right-[-30px] w-[44px] h-[40px] z-[100]"
                  delay={1.5}
                  iconUrl="/icons/twinkling-heart.svg"
                />
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute w-[620px] h-[690px] left-1/2 -translate-x-1/2 flex">
        <div className="mt-auto mx-auto">
          {showConfirmMessage && (
            <div className="flex items-center gap-[32px] ml-10">
              <div className="w-[352px] bg-white rounded-[10px] p-[6px] flex items-center justify-between">
                <Button
                  variant="post"
                  className="w-[240px] rounded-[8px] h-[36px] !p-0"
                  onClick={() => {
                    readIdsRef.current = new Set();
                    onNavigateToThanksMessageList();
                  }}>
                  過去にもらったメッセージを見る
                </Button>
                <Button
                  variant="text"
                  className="bg-transparent w-[100px] rounded-[8px] h-[36px] !p-0"
                  onClick={() => {
                    readIdsRef.current = new Set();
                    onFinish();
                  }}>
                  閉じる
                </Button>
              </div>
              {receivedThanksMessageList.length > 1 ? (
                <div className="flex items-center gap-[10px]">
                  <Button
                    variant="option"
                    className="w-[60px] !rounded-full h-[60px] !bg-white !p-0"
                    disabled={
                      isAnimating ||
                      (showReadMessage.show
                        ? showReadMessage.index == 0
                        : currentIndex == 0)
                    }
                    onClick={onPrevEnvelope}>
                    <ImageRound
                      name="Prev"
                      src="/icons/chevron-primary.svg"
                      className="!w-[14px] !h-[22px] rotate-180 cursor-pointer"
                    />
                  </Button>
                  <Button
                    variant="option"
                    className="w-[60px] !rounded-full h-[60px] !bg-white !p-0"
                    disabled={
                      isAnimating ||
                      (showReadMessage.show
                        ? showReadMessage.index ==
                          receivedThanksMessageList.length - 1
                        : currentIndex == receivedThanksMessageList.length - 1)
                    }
                    onClick={onNextEnvelope}>
                    <ImageRound
                      name="Next"
                      src="/icons/chevron-primary.svg"
                      className="!w-[14px] !h-[22px] cursor-pointer"
                    />
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div ref={birdRef} className="absolute z-50">
        <div className="relative w-[300px] h-[260px]">
          <Image
            src="/icons/bird.svg"
            alt="Bird"
            fill
            className="object-contain z-50"
          />
        </div>
      </div>
    </div>
  );
}