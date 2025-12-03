'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';

export default function HelpIconPortal() {
  const helpUrl = process.env.NEXT_PUBLIC_HELP_PAGE_URL || '#';

  return createPortal(
    <div className="absolute bottom-[58px] left-[57px] z-[9999]">
      <div
        className="w-[126px] h-[66px] bg-no-repeat bg-contain text-xs text-white font-bold pl-[10px] pt-2 pb-3"
        style={{ backgroundImage: 'url("/icons/help-menu.svg")' }}
        aria-label="Help page">
        <div className="px-4 relative top-[3px]">
          <div className="h-6 cursor-pointer hover:opacity-65">
            チュートリアル
          </div>
          <Link
            href={helpUrl}
            target="_blank"
            className="h-6 cursor-pointer hover:opacity-65">
            ヘルプページ
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
