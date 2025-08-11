import React from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { TabTypeSurveyValue } from '@constants/enums';
import useSurveyList from '@hooks/useListSurvey';

const AllSurveyTab = () => {
  useSurveyList({
    status: TabTypeSurveyValue.ALL,
  });
  return (
    <div>
      {/* Header */}
      <div className="h-fit flex items-center  text-white text-xs font-medium">
        <div className="w-[125px]">日付</div>
        <div className="w-[317px]  flex justify-between items-center">
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
          <div className="flex-grow px-5">質問</div>
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
        </div>
        <div className="flex-grow px-5">ステータス</div>
      </div>
      {/* Table */}
      <div className="h-full rounded-[14px] mt-[14px] overflow-x-hidden">
        <div className="w-full bg-white h-fit py-[14px]">
          {/* Accepting */}
          <div className="flex items-stretch bg-white text-black text-xs font-normal py-[14px]">
            {/* Date column */}
            <div className="w-[125px] pl-5 pr-2 py-[15px] flex items-center">
              2025年10月11日
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="w-[317px] px-[15px] flex items-center justify-between">
              <p className="text-[#228CDB] text-sm font-medium">
                明日のランチで食べたいものは何ですか？
              </p>
              <ImageRound
                name="Delete icon"
                src={'/icons/delete.svg'}
                className="w-fit h-fit cursor-pointer"
              />
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="px-5 w-[132px] flex flex-col items-center justify-center">
              <Button
                variant="option"
                className="w-[104px] h-[22px] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none !bg-[#FFEE6F]">
                受付中
              </Button>
              <p className="text-[#77858F] mt-[10px]">残り1日</p>
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="flex-grow flex items-center justify-center">
              <Button
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                }}
                className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                未回答
              </Button>
            </div>
          </div>
          <div className="bg-[#409EDE] w-full h-[2px]"></div>
          {/* My End */}
          <div className="flex items-stretch bg-white text-black text-xs font-normal py-[14px]">
            {/* Date column */}
            <div className="w-[125px] pl-5 pr-2 py-[15px] flex items-center">
              2025年10月11日
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="w-[317px] px-[15px] flex items-center justify-between">
              <p className="text-black text-sm font-medium">
                明日のランチで食べたいものは何ですか？
              </p>
              <ImageRound
                name="Delete icon"
                src={'/icons/delete.svg'}
                className="w-fit h-fit cursor-pointer"
              />
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="px-5 w-[132px] flex flex-col gap-[10px] items-center justify-center">
              <Button
                variant="outline"
                className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                マイアンケート
              </Button>
              <Button
                variant="outline"
                className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                受付終了
              </Button>
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="flex-grow flex items-center justify-center">
              <Button
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                }}
                className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                未回答
              </Button>
            </div>
          </div>
          <div className="bg-[#409EDE] w-full h-[2px]"></div>

          {/* End */}
          <div className="flex items-stretch bg-white text-black text-xs font-normal py-[14px]">
            {/* Date column */}
            <div className="w-[125px] pl-5 pr-2 py-[15px] flex items-center">
              2025年10月11日
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="w-[317px] px-[15px] flex items-center justify-between">
              <p className="text-black text-sm font-medium">
                明日のランチで食べたいものは何ですか？
              </p>
              <ImageRound
                name="Delete icon"
                src={'/icons/delete.svg'}
                className="w-fit h-fit cursor-pointer"
              />
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="px-5 w-[132px] flex flex-col gap-[10px] items-center justify-center">
              <Button
                variant="outline"
                className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                受付終了
              </Button>
            </div>
            <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
            <div className="flex-grow flex items-center justify-center">
              <Button
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                }}
                className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                未回答
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllSurveyTab;
