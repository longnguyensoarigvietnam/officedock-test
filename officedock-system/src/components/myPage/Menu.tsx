import lodash from 'lodash';

import ImageRound from '@components/common/ImageRound';

import { MyPageMenuItem } from '@interfaces/menu';

import { MY_PAGE_MENU } from '@constants/menu';

export const MyPageMenu = () => {
  const menuItemsClone: MyPageMenuItem[] = lodash.cloneDeep(MY_PAGE_MENU);

  return (
    <div className="flex flex-col gap-[35px]">
      {menuItemsClone.map((page: MyPageMenuItem, index) => {
        return (
          <div
            key={index}
            style={{
              background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
              boxShadow: '0px 4px 0px 0px #0028A140',
            }}
            className="relative w-[110px] cursor-pointer hover:opacity-80 h-fit rounded-[10px] pb-[15px] pt-[30px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
            <div className='flex flex-col items-center'>
              {page.name.split(' ').map((section, index) => (
                <p key={index}>{section}</p>
              ))}
            </div>
            <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
              <ImageRound
                name={page.iconName}
                src={page.iconSrc}
                className={`w-fit h-fit `}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
