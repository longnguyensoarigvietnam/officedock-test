import Link from 'next/link';
import lodash from 'lodash';

import ImageRound from '@components/common/ImageRound';

import { MyPageMenuItem } from '@interfaces/menu';

import { MY_PAGE_MENU, VISIT_PAGE_MENU } from '@constants/menu';
import { MAXIMUM_VISIBLE_COUNT } from '@constants';
import { pageRouters } from '@constants/routers';

interface PropMenuMyPage {
  onClickSettingSurvey: () => void;
  onOpenSendThanksMessageForm?: () => void;
  unAnsweredSurveyCount?: number;
  isOpenSurveys?: boolean;
  isVisitRoom?: boolean;
  isHasMvpVoting?: boolean;
}

export const MyPageMenu = ({
  isHasMvpVoting = false,
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
    <div className="flex flex-col gap-[3.37vh]">
      {menuItemsClone.map((page: MyPageMenuItem, index) => {
        return (
          <div
            key={index}
            className="relative group z-[9999]"
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
                boxShadow: '0px 0.45vh 0px 0px #0028A140',
              }}
              className="relative w-[12.36vh]  cursor-pointer hover:opacity-80 h-fit rounded-[1.12vh] pb-[1.69vh] pt-[4.27vh] flex flex-col justify-end items-center text-white text-[1.46vh] font-bold">
              <div className="flex flex-col gap-[0.11vh] items-center">
                {page.name.split(' ').map((section, index) => (
                  <p key={index} className="leading-none">
                    {section}
                  </p>
                ))}
              </div>

              {/* Child status */}
              {page.child &&
                ((page.name == pageRouters.SURVEY.name && isOpenSurveys) ||
                  (page.name == pageRouters.MVP.name && isHasMvpVoting)) && (
                  <>
                    <p className="text-[1.12vh] bg-[#FFEE6F] mt-[0.79vh] text-black rounded-full w-[7.87vh] h-[2.24vh] flex items-center justify-center">
                      投票受付中
                    </p>
                  </>
                )}

              {/* Icon */}
              <div className="w-[5.39vh] h-[5.39vh] absolute -top-[2.25vh] left-1/2 transform -translate-x-1/2">
                <ImageRound
                  name={page.iconName}
                  src={page.iconSrc}
                  className="w-[5.39vh] h-[5.39vh]"
                />
              </div>
            </Link>

            {page.child && (
              <div
                style={{
                  boxShadow: '0px 0.45vh 0.45vh 0px #1D2D3F0A',
                }}
                className="absolute after:content-[''] after:absolute after:top-0 after:left-[-1.12vh] after:w-[1.12vh] after:h-full after:bg-transparent hidden group-hover:flex top-0 text-black left-[13.43vh] text-[1.46vh] flex-col gap-[0.22vh] py-[0.11vh] px-[0.22vw] font-medium bg-white min-w-[20.22vh] w-fit h-fit rounded-md border border-button">
                {page.child.map((item, index) => (
                  <>
                    <Link
                      key={index}
                      href={item.href}
                      onClick={() => {
                        if (item.onClick) onClickSettingSurvey();
                      }}
                      className={`px-[0.55vw] py-[1.12vh] flex hover:opacity-85 w-full hover:text-primary cursor-pointer ${
                        item.name == pageRouters.CUSTOMIZE_ITEM.name &&
                        '!w-[22.47vh]'
                      }`}>
                      {item.name}
                      {item.displayCount && unAnsweredSurveyCount ? (
                        <span className="bg-[#FFEE6F] ml-[0.41vw] h-[2.24vh] flex items-center justify-center flex-shrink-0 w-[4.27vh] text-[1.46vh] rounded-[100px] text-black font-bold">
                          {unAnsweredSurveyCount > MAXIMUM_VISIBLE_COUNT
                            ? `${MAXIMUM_VISIBLE_COUNT}+`
                            : unAnsweredSurveyCount}
                        </span>
                      ) : (
                        <></>
                      )}
                    </Link>

                    {page.child && index < page?.child.length - 1 && (
                      <div className="w-full h-[0.11vh] bg-[#EBF1F7]"></div>
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
