/* eslint-disable @next/next/no-img-element */
'use client';
import ImageRound from '@components/common/ImageRound';
import SmoothImage from '@components/common/ImageRound/SmoothImage';
import { AvatarItemUser } from '@interfaces/shop';

interface props {
  isPodium?: boolean;
  itemsPreview: AvatarItemUser[];
  isFetchingCreationDataCommon?: boolean;
}

export const RenderAccessoriesPreview = ({
  isPodium = false,
  itemsPreview,
  isFetchingCreationDataCommon,
}: props) => {
  return (
    <div className="relative h-full w-full ">
      {isPodium && (
        <ImageRound
          src={`/images/users/podium.png`}
          name={'podium'}
          className={`absolute top-[94%] left-[24px] !w-fit !h-fit inset-0  object-contain pointer-events-none`}
          style={{ zIndex: 0 }}
        />
      )}
      {!isFetchingCreationDataCommon &&
        itemsPreview.map((item, index) => (
          <SmoothImage
            key={item.name}
            src={item.url || `/images/users/${item.name}.png`}
            name={item.name}
            className={`absolute bottom-0 inset-0 w-full h-full object-contain pointer-events-none`}
            style={{ zIndex: index }}
            fill
          />
        ))}
    </div>
  );
};
