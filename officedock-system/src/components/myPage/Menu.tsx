import Link from 'next/link';
import lodash from 'lodash';

import ImageRound from '@components/common/ImageRound';

import { MyPageMenuItem } from '@interfaces/menu';

import { MY_PAGE_MENU, VISIT_PAGE_MENU } from '@constants/menu';
import { MAXIMUM_VISIBLE_COUNT } from '@constants';

interface PropMenuMyPage {
  onClickSettingSurvey: () => void;
  onOpenSendThanksMessageForm?: () => void;
  unAnsweredSurveyCount?: number;
  isOpenSurveys?: boolean;
  isVisitRoom?: boolean;
}

export const MyPageMenu = ({
  isVisitRoom = false,
  isOpenSurveys = false,
  unAnsweredSurveyCount,
  onClickSettingSurvey,
  onOpenSendThanksMessageForm,
}: PropMenuMyPage) => {
  const menuItemsClone: MyPageMenuItem[] = isVisitRoom
    ? lodash.cloneDeep(VISIT_PAGE_MENU)
    : lodash.cloneDeep(MY_PAGE_MENU);

  return (
    <div className="flex flex-col gap-[35px]">
      {menuItemsClone.map((page: MyPageMenuItem, index) => {
        return (
          <div
            key={index}
            className="relative group"
            onClick={() =>
              page.openSendThanksMessageForm &&
              onOpenSendThanksMessageForm &&
              onOpenSendThanksMessageForm()
            }>
            <Link
              key={index}
              href={page.href}
              style={{
                background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                boxShadow: '0px 4px 0px 0px #0028A140',
              }}
              className="relative w-[110px] cursor-pointer hover:opacity-80 h-fit rounded-[10px] pb-[15px] pt-[30px] flex flex-col justify-end items-center text-white text-[13px] font-bold">
              <div className="flex flex-col items-center">
                {page.name.split(' ').map((section, index) => (
                  <p key={index}>{section}</p>
                ))}
              </div>
              {/* Child */}
              {page.child && isOpenSurveys && (
                <>
                  <p className="text-[10px]  bg-[#FFEE6F] mt-[3px] text-black rounded-full w-[70px] h-5 flex items-center justify-center">
                    {' '}
                    投票受付中
                  </p>
                </>
              )}
              <div className="w-fit h-fit absolute top-[-30%] left-1/2 transform -translate-x-1/2">
                <ImageRound
                  name={page.iconName}
                  src={page.iconSrc}
                  className={`w-fit h-fit `}
                />
              </div>
            </Link>
            {page.child && (
              <div
                style={{
                  boxShadow: '0px 4px 4px 0px #1D2D3F0A',
                }}
                className="absolute after:content-[''] after:absolute after:top-0 after:left-[-10px] after:w-[10px] after:h-full after:bg-transparent hidden group-hover:flex top-0 text-black left-[116px] text-sm  flex-col gap-[2px] py-1 font-medium bg-white w-[180px] h-fit rounded-md border border-button">
                {page.child.map((item, index) => (
                  <>
                    <Link
                      key={index}
                      href={item.href}
                      onClick={() => {
                        if (item.onClick) {
                          onClickSettingSurvey();
                        }
                      }}
                      className="px-2 py-[10px] hover:opacity-85 hover:text-primary cursor-pointer">
                      {item.name}{' '}
                      {item.displayCount && unAnsweredSurveyCount ? (
                        <span className="bg-[#FFEE6F] ml-1 py-[5px] px-[6px] w-[38px] text-[13px] rounded-[100px] text-black font-bold">
                          {unAnsweredSurveyCount > MAXIMUM_VISIBLE_COUNT
                            ? `${MAXIMUM_VISIBLE_COUNT}+`
                            : unAnsweredSurveyCount}
                        </span>
                      ) : (
                        <></>
                      )}
                    </Link>
                    {page.child && index < page?.child.length - 1 && (
                      <div className="w-full h-[1px] bg-[#EBF1F7]"></div>
                    )}
                  </>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
