'use client';
import { useContext } from 'react';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import ImageRound from '@components/common/ImageRound';
import { updateAvatarUrl } from '@utils';

interface props {
  isPodium?: boolean;
}

export const RenderAccessories = ({ isPodium = false }: props) => {
  const { dataItems, setDataItem } = useContext(GlobalStateContext);

  const { isFetchingCreationDataCommon } = useCreationDataCommon({
    options: {
      get_items_of_user: true,
    },
    onSuccess: (data) => {
      if (data.itemsOfUser) {
        const updates = data.itemsOfUser.map((item) => ({
          type: item.itemType,
          url: item.fullFile,
        }));
        const merged = updateAvatarUrl(dataItems, updates);
        setDataItem(merged);
      }
    },
  });

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
        dataItems.map((item, index) => (
          <ImageRound
            key={item.name}
            src={item.url || `/images/users/${item.name}.png`}
            name={item.name}
            className={`absolute bottom-0 inset-0 w-full h-full object-contain pointer-events-none`}
            style={{ zIndex: index }}
          />
        ))}
    </div>
  );
};
