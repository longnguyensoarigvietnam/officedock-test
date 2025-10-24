'use client';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SmoothImage from '@components/common/ImageRound/SmoothImage';
import Loader from '@components/common/Loader';
import ImageRound from '@components/common/ImageRound';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { updateAvatarUrl } from '@utils';
import { CACHE_KEY, CACHE_TTL } from '@constants';

interface Props {
  isPodium?: boolean;
  isBoat?: boolean;
  user_id?: string | number;
  handleShowData?: () => void;
}

export const RenderAccessories = ({
  isPodium = false,
  isBoat = false,
  user_id,
  handleShowData,
}: Props) => {
  const { dataItems, setDataItem } = useContext(GlobalStateContext);
  const [isFetching, setIsFetching] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const totalImages = useRef(0);
  const prevItemsRef = useRef<string>('');

  const initialCache = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (
        parsed &&
        Array.isArray(parsed.data) &&
        Date.now() - parsed.timestamp < CACHE_TTL
      ) {
        return parsed.data;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  // If there is a buffer at the beginning → allocate it to dataItems
  useEffect(() => {
    if (initialCache && initialCache.length > 0) {
      setDataItem(initialCache);
      totalImages.current = initialCache.length;
    }
    setIsFetching(true); // still enable loader
  }, [initialCache, setDataItem]);

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
    const snapshot = JSON.stringify(dataItems.map((i) => i.url));
    if (snapshot !== prevItemsRef.current) {
      prevItemsRef.current = snapshot;
      totalImages.current = dataItems.length;
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

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      {isFetching && <Loader className={`mx-auto my-auto z-[30]`} />}

      {isPodium && (
        <ImageRound
          src={`/images/users/podium.png`}
          name={'podium'}
          className="absolute top-[94%] left-[24px] !w-fit !h-fit inset-0 object-contain pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      {isBoat && (
        <ImageRound
          src={`/images/users/boat.png`}
          name={'boat'}
          className="absolute bottom-0 left-0 !w-fit !h-fit inset-0 object-contain pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      <div
        key={renderKey}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isFetching ? 'opacity-0' : 'opacity-100'
        }`}>
        {!isFetchingCreationDataCommon &&
          dataItems.map((item, index) => (
            <SmoothImage
              key={`${item.name}-${item.url}-${renderKey}`}
              src={item.url || `/images/users/${item.name}.png`}
              name={item.name}
              className="absolute bottom-0 inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: index }}
              fill
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
