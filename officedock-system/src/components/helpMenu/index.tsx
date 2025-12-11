'use client';

import { createPortal } from 'react-dom';

export default function HelpIconPortal() {
  return createPortal(
    <div className="absolute bottom-[78px] left-[60px] z-[9999]">
      <div className="relative">
        <div
          style={{
            background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
          }}
          className="w-[126px] h-[40px]  text-xs text-white font-bold 
           pl-[10px] pt-2 pb-3 rounded-lg relative">
          <div className="px-4 relative top-[3px]">
            <div className="h-6 cursor-pointer hover:opacity-65">
              ヘルプページへ
            </div>
          </div>
        </div>

        <div
          className="absolute left-[-10px] top-[17px]
         w-0 h-0 
         border-t-[5px] border-t-transparent
         border-b-[5px] border-b-transparent
         border-r-[12px] border-r-[#406ADD]"></div>
      </div>
    </div>,
    document.body,
  );
}
