'use client';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import SmoothImage from '@components/common/ImageRound/SmoothImage';
import Loader from '@components/common/Loader';
import ImageRound from '@components/common/ImageRound';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { updateAvatarUrl } from '@utils';
import { CACHE_KEY } from '@constants';

interface Props {
  isPodium?: boolean;
  isBoat?: boolean;
  user_id?: string | number;
  isScale?: boolean;
  handleShowData?: () => void;
}

export const RenderAccessories = ({
  isPodium = false,
  isBoat = false,
  isScale = false,
  user_id,
  handleShowData,
}: Props) => {
  const { dataItems, setDataItem } = useContext(GlobalStateContext);
  const [isFetching, setIsFetching] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const totalImages = useRef(0);
  const prevItemsRef = useRef<string>('');

  // --- API fetch
  const { isFetchingCreationDataCommon } = useCreationDataCommon({
    options: {
      get_items_of_user: true,
    },
    userId: user_id,
    onSuccess: (data) => {
      if (data.itemsOfUser) {
        const updates = data.itemsOfUser.map((item) => ({
          type: item.itemType,
          url: item.fullFile,
        }));
        const merged = updateAvatarUrl(dataItems, updates);
        setDataItem(merged);
        totalImages.current = merged.length;
        if (!user_id) {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: merged,
            }),
          );
        }
      }
    },
  });

  useLayoutEffect(() => {
    const snapshot = JSON.stringify(dataItems?.map((i) => i.url));
    if (snapshot !== prevItemsRef.current) {
      prevItemsRef.current = snapshot;
      totalImages.current = dataItems?.length || 0;
      if (totalImages.current > 0) {
        setIsFetching(true);
        setImagesLoaded(0);
        setRenderKey((k) => k + 1);
      }
    }
  }, [dataItems]);

  useEffect(() => {
    if (totalImages.current > 0 && imagesLoaded >= totalImages.current) {
      const t = setTimeout(() => {
        setIsFetching(false);
        handleShowData && handleShowData();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [imagesLoaded, handleShowData]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isScale) {
      setScale(1);
      return;
    }

    const update = () => {
      const h = window.innerHeight;
      const base = 950; // base height
      setScale(h / base);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isScale]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...(isScale
          ? {
              transform: `scale(${scale})`,
              transformOrigin: 'center bottom',
            }
          : {}),
      }}
      className="relative h-full w-full flex items-center justify-center">
      {isFetching && <Loader className={`mx-auto my-auto z-[30]`} />}

      {isPodium && (
        <ImageRound
          src={`/images/users/podium.png`}
          name={'podium'}
          className="absolute top-[94%] left-[44px] !w-fit !h-fit inset-0 object-contain pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      {isBoat && (
        <ImageRound
          src={`/images/users/boat.png`}
          name={'boat'}
          className="absolute bottom-0 left-4 !w-fit !h-fit inset-0 object-contain pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      <div
        key={renderKey}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isFetching ? 'opacity-0' : 'opacity-100'
        }`}>
        {!isFetchingCreationDataCommon &&
          dataItems?.map((item, index) => (
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
  );
};
