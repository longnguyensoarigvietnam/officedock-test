import { useRouter } from 'next/navigation';
import React from 'react';

import ImageRound from '@components/common/ImageRound';
import { pageRouters } from '@constants/routers';

const BackToPage = () => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(pageRouters.MY_PAGE.href)}
      className="flex items-center gap-[10px] !cursor-pointer">
      <ImageRound
        name="back"
        src={'/icons/back.svg'}
        className={`w-fit h-fit `}
      />
      <span className="text-sm text-black cursor-pointer">戻る</span>
    </div>
  );
};

export default BackToPage;
