'use client';
import React, { useState } from 'react';
import ImageRound from '@components/common/ImageRound';
import { RenderAccessories } from '@components/custom/UserCustomize';
import Button from '@components/common/Button';
import AllSurveyTab from '@components/survey/AllSurveyTab';

import { TabTypeSurvey } from '@constants/enums';

const SurveyListPage = () => {
  const [activeTab, setActiveTab] = useState<TabTypeSurvey>(TabTypeSurvey.ALL);

  const listAvatar = ['body', 'head-full', 'hat', 'shoes'];

  const renderContent = () => {
    switch (activeTab) {
      case TabTypeSurvey.ALL:
        return <AllSurveyTab />;

      default:
        return null;
    }
  };

  const tabSideSurvey = [
    { name: TabTypeSurvey.ALL, value: TabTypeSurvey.ALL },
    { name: TabTypeSurvey.RECEIVING, value: TabTypeSurvey.RECEIVING },
    { name: TabTypeSurvey.ENDED, value: TabTypeSurvey.ENDED },
    { name: TabTypeSurvey.MY_SURVEY, value: TabTypeSurvey.MY_SURVEY },
  ];

  return (
    <div className="h-full w-full">
      <div
        style={{
          backgroundImage: 'url("/images/bg-profile.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
        }}
        className="bg-red-300 rounded-bl-[30px] relative rounded-tr-[30px] rounded-br-[30px] h-[calc(100vh-120px)] w-full">
        <div className="flex absolute top-0 left-0 ">
          <div className="h-20 bg-white w-fit px-10 py-4 text-[#77858F] font-medium flex items-center gap-[10px] rounded-br-[30px]">
            <ImageRound
              name="Left icon"
              src={'/icons/chevron-left.svg'}
              className={`w-fit h-fit cursor-pointer`}
            />
            <span className="text-sm text-black">戻る</span>
            <ImageRound
              name="Room icon"
              src={'/icons/room-profile.svg'}
              className={`w-fit h-fit ml-[10px]`}
            />
            <span className="text-sm text-black ml-1">アンケート</span>
          </div>
        </div>
        <div className="relative  pr-[30px] flex w-full justify-between items-center h-full">
          {/* User */}
          <div className="flex-shrink-0 h-full">
            <div className="h-[424px] w-[336px] ml-[123px] mt-[325px] relative">
              <RenderAccessories images={listAvatar} />
            </div>
            {/* Message user */}
            <div
              style={{
                background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                boxShadow: '0px 4px 0px 0px #355AC940',
              }}
              className="absolute top-[116px] left-[117px] p-[10px] rounded-[14px] w-[323px] h-fit] ">
              <p className="text-white text-[13px] font-bold">マイルくん</p>
              <div className=" mt-[5px] w-full bg-white rounded-[5px] flex flex-col items-center px-3 py-[17px] text-[13px] font-semibold text-black">
                <p>
                  {' '}
                  みんなの声を聞くために、新しくアンケートを作ってみるのはどうかな？
                </p>
                <div
                  style={{
                    background:
                      'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                    boxShadow: '0px 4px 0px 0px #355AC940',
                  }}
                  className="flex mt-4 w-[194px] h-[52px] cursor-pointer hover:opacity-80 rounded-[10px] text-white items-center justify-center gap-[10px]">
                  <ImageRound
                    name="Heart icon"
                    src={'/icons/heart.svg'}
                    className={`w-7 h-7 `}
                  />
                  <p>アンケートを作る</p>
                </div>
              </div>
            </div>
            <div className="bg-[#5282FB] rotate-[20deg] absolute clip-diagonal-left h-[37px] w-[20px] top-[295px] left-[375px]"></div>
          </div>
          {/* List survey  */}
          <div
            style={{
              background: 'rgba(53, 153, 216, 0.8)',
              boxShadow: '0px 4px 10px 0px #0000000D',
            }}
            className="w-[720px] h-[715px] font-medium text-white border border-white rounded-3xl py-[30px]">
            {/* Button switch */}
            <div className="flex px-[30px] items-center justify-between">
              <p className="text-[18px]">アンケート一覧</p>
              <div className="flex items-center gap-[6px] w-fit p-[6px] bg-white rounded-[20px]">
                {tabSideSurvey.map((tab) => {
                  const isActive = activeTab === tab.value;

                  return (
                    <Button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      style={{
                        background: isActive
                          ? 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)'
                          : '#EBF1F7',
                      }}
                      variant={isActive ? 'primary' : 'outline'}
                      className={`font-bold  !border-none w-fit h-[30px] text-xs  !rounded-[20px] !py-0 !px-4 ${
                        isActive ? '' : '!text-[#77858F]  !border-none'
                      }`}>
                      {tab.name}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="h-full w-full px-[30px] mt-5">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyListPage;
