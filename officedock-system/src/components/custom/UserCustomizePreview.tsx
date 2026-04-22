'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import SmoothImage from '@components/common/ImageRound/SmoothImage';
import Loader from '@components/common/Loader';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { ItemAvatarType } from '@constants/enums';
import { CACHE_KEY } from '@constants';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { AvatarItemUser } from '@interfaces/shop';
import { updateAvatarUrl } from '@utils';

interface Props {
  isPodium?: boolean;
  itemsPreview: AvatarItemUser[];
  selectedItemType: string | null;
  setItemsPreview: React.Dispatch<React.SetStateAction<AvatarItemUser[]>>;
}

export const RenderAccessoriesPreview = ({
  isPodium = false,
  itemsPreview,
  selectedItemType,
  setItemsPreview,
}: Props) => {
  const [showLoader, setShowLoader] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const totalImages = useRef(0);
  const prevUrlsRef = useRef<string>('');

  const { isFetchingCreationDataCommon } = useCreationDataCommon({
    options: {
      get_balances_of_user: true,
      get_items_of_user: true,
    },
    onSuccess: (data) => {
      if (data.itemsOfUser) {
        const updates = data.itemsOfUser.map((item) => ({
          type: item.itemType,
          url: item.fullFile,
        }));
        const merged = updateAvatarUrl(itemsPreview, updates);
        if (JSON.stringify(merged) !== JSON.stringify(itemsPreview)) {
          setItemsPreview(merged);
        }
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            data: merged,
          }),
        );
      }
    },
  });

  useLayoutEffect(() => {
    const urls = JSON.stringify(itemsPreview.map((i) => i.url));
    if (urls !== prevUrlsRef.current) {
      prevUrlsRef.current = urls;
      totalImages.current = itemsPreview.length;
      if (totalImages.current > 0) {
        setShowLoader(true);
        setImagesLoaded(0);
        setRenderKey((k) => k + 1);
      } else {
        setShowLoader(false);
      }
    }
  }, [itemsPreview]);

  useEffect(() => {
    if (totalImages.current > 0 && imagesLoaded >= totalImages.current) {
      const t = setTimeout(() => setShowLoader(false), 0);
      return () => clearTimeout(t);
    }
  }, [imagesLoaded]);

  return (
    <>
      <div className="relative h-full w-full flex items-center justify-center">
        {showLoader && <Loader />}

        <div
          key={renderKey}
          style={{ opacity: showLoader ? 0 : 1 }}
          className={`absolute inset-0 transition-opacity duration-500 `}>
          {isPodium && (
            <ImageRound
              src="/images/users/podium.png"
              name="podium"
              className="absolute top-[94%] left-[24px] !w-fit !h-fit inset-0 object-contain pointer-events-none"
              style={{ zIndex: 0 }}
            />
          )}
          {!isFetchingCreationDataCommon &&
            itemsPreview.map((item, index) => (
              <SmoothImage
                key={`${item.name}-${item.url}-${renderKey}`}
                src={item.url || `/images/users/${item.name}.png`}
                name={item.name}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ zIndex: index }}
                onLoad={() =>
                  setImagesLoaded((prev) =>
                    Math.min(prev + 1, totalImages.current),
                  )
                }
                onError={() =>
                  setImagesLoaded((prev) =>
                    Math.min(prev + 1, totalImages.current),
                  )
                }
              />
            ))}
        </div>
      </div>
      {selectedItemType && !showLoader && (
        <div style={{ opacity: showLoader ? 0 : 1 }} className="">
          {selectedItemType == ItemAvatarType.HAT && (
            <>
              {/* RIGHT 1 */}
              <TwinklingIcon
                className="absolute top-[20px] left-[-10px] !w-8 !h-8"
                delay={0}
                iconUrl="/icons/star-new.svg"
              />
              {/* RIGHT 2 */}
              <TwinklingIcon
                className="absolute top-[65px] left-[-55px] !w-8 !h-8"
                delay={1.2}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* RIGHT 3 */}
              <TwinklingIcon
                className="absolute top-[125px] left-[-25px] !w-8 !h-8"
                delay={1}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 1 */}
              <TwinklingIcon
                className="absolute top-[20px] right-[15px] !w-8 !h-8"
                delay={0.8}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 2 */}
              <TwinklingIcon
                className="absolute top-[65px] right-[-30px] !w-8 !h-8"
                delay={0.5}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* LEFT 3 */}
              <TwinklingIcon
                className="absolute top-[125px] right-[0px] !w-8 !h-8"
                delay={1.5}
                iconUrl="/icons/star-new.svg"
              />
            </>
          )}
          {selectedItemType == ItemAvatarType.BODY && (
            <>
              {/* RIGHT 1 */}
              <TwinklingIcon
                className="absolute top-[210px] left-[-10px] !w-8 !h-8"
                delay={0}
                iconUrl="/icons/star-new.svg"
              />
              {/* RIGHT 2 */}
              <TwinklingIcon
                className="absolute top-[280px] left-[-55px] !w-8 !h-8"
                delay={1.2}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* RIGHT 3 */}
              <TwinklingIcon
                className="absolute top-[350px] left-[-25px] !w-8 !h-8"
                delay={1}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 1 */}
              <TwinklingIcon
                className="absolute top-[210px] right-[15px] !w-8 !h-8"
                delay={0.8}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 2 */}
              <TwinklingIcon
                className="absolute top-[280px] right-[-30px] !w-8 !h-8"
                delay={0.5}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* LEFT 3 */}
              <TwinklingIcon
                className="absolute top-[350px] right-[0px] !w-8 !h-8"
                delay={1.5}
                iconUrl="/icons/star-new.svg"
              />
            </>
          )}

          {selectedItemType == ItemAvatarType.SHOES && (
            <>
              {/* RIGHT 1 */}
              <TwinklingIcon
                className="absolute bottom-[50px] left-[25px] !w-8 !h-8"
                delay={0}
                iconUrl="/icons/star-new.svg"
              />
              {/* RIGHT 2 */}
              <TwinklingIcon
                className="absolute bottom-[5px] left-[5px] !w-8 !h-8"
                delay={1.2}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* RIGHT 3 */}
              <TwinklingIcon
                className="absolute bottom-[-45px] left-[55px] !w-8 !h-8"
                delay={1}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 1 */}
              <TwinklingIcon
                className="absolute bottom-[50px] right-[55px] !w-8 !h-8"
                delay={0.8}
                iconUrl="/icons/star-new.svg"
              />
              {/* LEFT 2 */}
              <TwinklingIcon
                className="absolute bottom-[5px] right-[35px] !w-8 !h-8"
                delay={0.5}
                iconUrl="/icons/star-new-main.svg"
              />
              {/* LEFT 3 */}
              <TwinklingIcon
                className="absolute bottom-[-45px] right-[95px] !w-8 !h-8"
                delay={1.5}
                iconUrl="/icons/star-new.svg"
              />
            </>
          )}
        </div>
      )}
    </>
  );
};
