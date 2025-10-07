'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import { RenderAccessories } from '@components/custom/UserCustomize';
import Button from '@components/common/Button';
import AllSurveyTab from '@components/survey/AllSurveyTab';
import ReceivingSurveyTab from '@components/survey/ReceivingSurveyTab';
import EndedSurveyTab from '@components/survey/EndedSurveyTab';
import MySurveyTab from '@components/survey/MySurveyTab';
import ActionAnswerSurveyModal from '@components/modals/ActionAnswerSurvey';
import ActionSettingSurvey from '@components/modals/ActionSettingSurvey';
import SuccessSurveyActionModal from '@components/modals/SuccessSurveyActionModal';
import CreateTweetModal from '@components/modals/CreateTweetModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import { TabTypeSurvey, TabTypeSurveyValue } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import { useUpdateSurveyCache } from '@hooks/CacheQuery/useUpdateSurveyCache';
import { useErrorToast } from '@hooks/useErrorToast';

import { TweetFormData } from '@interfaces/tweet';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import api from '@base/api';

const SurveyListPage = () => {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const surveyId = searchParams.get('question') ?? '';
  const tabParam = searchParams.get('tab') as TabTypeSurvey | null;
  const mySurvey = searchParams.get('my-survey');

  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState<TabTypeSurvey>(
    tabParam || TabTypeSurvey.ALL,
  );
  const [surveyDetailId, setSurveyDetailId] = useState('');

  const [isShowActionAnswerModal, setIsShowActionAnswerModal] =
    useState<boolean>(!!surveyId || !!surveyDetailId);

  // Survey
  const [openSettingSurvey, setOpenSettingSurvey] = useState(false);
  const [openSuccessSurvey, setOpenSuccessSurvey] = useState(false);
  const [isMySurvey, setIsMySurvey] = useState(!!mySurvey);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [selectedSurveyToDelete, setSelectedSurveyToDelete] = useState<
    number | null
  >(null);

  // Tweet
  const [openCreateTweetModal, setOpenCreateTweetModal] =
    useState<boolean>(false);
  const [tweetMessage, setTweetMessage] = useState<string>('');

  const handleSetTabParam = (tab: string) => {
    params.set('tab', tab);

    router.push(`?${params.toString()}`);
  };

  // Set param
  const handleSetParam = (id: string, isMySurvey?: boolean) => {
    if (id) {
      params.set('question', id);
      if (isMySurvey) {
        params.set('my-survey', 'true');
      }
    }

    router.push(`?${params.toString()}`);
  };
  // Handle remove param
  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('question');
    params.delete('my-survey');

    router.replace(`?${params.toString()}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabTypeSurvey.ALL:
        return (
          <AllSurveyTab
            handleAnswer={(id: number, isMySurvey?: boolean) => {
              setSurveyDetailId(String(id));
              handleSetParam(String(id), isMySurvey);
              setIsShowActionAnswerModal(true);
              setIsMySurvey(isMySurvey || false);
            }}
            handleDelete={(id: number) => {
              setSelectedSurveyToDelete(id);
              setOpenConfirmDeleteModal(true);
            }}
          />
        );
      case TabTypeSurvey.RECEIVING:
        return (
          <ReceivingSurveyTab
            handleAnswer={(id: number, isMySurvey?: boolean) => {
              setSurveyDetailId(String(id));
              handleSetParam(String(id), isMySurvey);
              setIsShowActionAnswerModal(true);
              setIsMySurvey(isMySurvey || false);
            }}
            handleDelete={(id: number) => {
              setSelectedSurveyToDelete(id);
              setOpenConfirmDeleteModal(true);
            }}
          />
        ); // Replace with ReceivingSurveyTab when implemented
      case TabTypeSurvey.ENDED:
        return (
          <EndedSurveyTab
            handleAnswer={(id: number, isMySurvey?: boolean) => {
              setSurveyDetailId(String(id));
              handleSetParam(String(id), isMySurvey);
              setIsShowActionAnswerModal(true);
              setIsMySurvey(isMySurvey || false);
            }}
            handleDelete={(id: number) => {
              setSelectedSurveyToDelete(id);
              setOpenConfirmDeleteModal(true);
            }}
          />
        );
      case TabTypeSurvey.MY_SURVEY:
        return (
          <MySurveyTab
            handleAnswer={(id: number, isMySurvey?: boolean) => {
              setSurveyDetailId(String(id));
              handleSetParam(String(id), isMySurvey);
              setIsShowActionAnswerModal(true);
              setIsMySurvey(isMySurvey || false);
            }}
            handleDelete={(id: number) => {
              setSelectedSurveyToDelete(id);
              setOpenConfirmDeleteModal(true);
            }}
          />
        );

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

  // Cache update and refresh functions
  const { updateSurveyAnswered, refreshSurveyList, removeSurveyFromCache } =
    useUpdateSurveyCache();

  const mapping: Record<TabTypeSurvey, TabTypeSurveyValue> = {
    [TabTypeSurvey.ALL]: TabTypeSurveyValue.ALL,
    [TabTypeSurvey.RECEIVING]: TabTypeSurveyValue.RECEIVING,
    [TabTypeSurvey.ENDED]: TabTypeSurveyValue.ENDED,
    [TabTypeSurvey.MY_SURVEY]: TabTypeSurveyValue.MY_SURVEY,
  };
  const activeTabValue = mapping[activeTab];

  const handleAnswerSurvey = (id: number) => {
    updateSurveyAnswered(id, activeTabValue); // Update cache when survey is answered
  };

  // Call API to send tweet message
  const handleSendTweetMessage = async (data: TweetFormData) => {
    setIsLoading(true);
    const { data: response } = await api.post(apiRouters.TWEET_LIST, data);
    return response;
  };

  const { mutate: sendTweetMessage, isSuccess: isSendTweetSuccess } =
    useMutation('sendTweetMessage', handleSendTweetMessage, {
      onSuccess: () => {
        setTweetMessage('');
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });

  // Delete location API
  const handleDeleteSurvey = async (id: string) => {
    setIsLoading(true);
    return await api.delete(apiRouters.SURVEY_DETAIL(id));
  };

  const { mutate: deleteSurvey } = useMutation(
    'postDeleteSurvey',
    handleDeleteSurvey,
    {
      onSuccess: () => {
        if (selectedSurveyToDelete) {
          removeSurveyFromCache(selectedSurveyToDelete, activeTabValue);
        }
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        setOpenConfirmDeleteModal(false);
        setSelectedSurveyToDelete(null);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_DELETE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Handle confirm delete
  const handleConfirmDeleteLocation = () => {
    if (selectedSurveyToDelete) {
      deleteSurvey(String(selectedSurveyToDelete));
    }
  };

  return (
    <>
      <div className="h-full w-full">
        <div
          style={{
            backgroundImage: 'url("/images/bg-profile.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
          className="rounded-bl-[30px] relative rounded-r-[30px] h-[calc(100vh-120px)] w-full">
          <div className="flex absolute top-0 left-0 shadow-common rounded-br-[30px]">
            <div className="h-20 w-[294px] z-[30] bg-white py-4 text-[#77858F] font-medium flex items-center justify-center rounded-br-[30px]">
              <div
                onClick={() => router.push(pageRouters.MY_PAGE.href)}
                className="flex items-center gap-[10px]">
                <ImageRound
                  name="Left icon"
                  src={'/icons/chevron-left.svg'}
                  className={`w-[8px] h-[16px] !cursor-pointer`}
                />
                <span className="text-sm text-black cursor-pointer">戻る</span>
              </div>
              <ImageRound
                name="Survey icon"
                src={'/icons/survey.svg'}
                className={`w-[26px] h-[26px] ml-5`}
              />
              <span className="text-[22px] text-black ml-[10px]">
                {pageRouters.SURVEY.name}
              </span>
            </div>
          </div>
          <div className="relative  pr-[30px] flex w-full justify-between items-center h-full">
            {/* User */}
            <div className="flex-shrink-0 h-full">
              <div className="h-[424px] w-[336px] ml-[123px] mt-[325px] relative">
                <RenderAccessories />
              </div>
              {/* Message user */}
              <div
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
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
                    onClick={() => setOpenSettingSurvey(true)}
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
              className="w-[720px] h-[calc(100vh_-_260px)] font-medium text-white border border-white rounded-3xl py-[30px]">
              {/* Button switch */}
              <div className="flex px-[30px] items-center justify-between">
                <p className="text-[18px]">アンケート一覧</p>
                <div className="flex items-center gap-[6px] w-fit p-[6px] bg-white rounded-[20px]">
                  {tabSideSurvey.map((tab) => {
                    const isActive = activeTab === tab.value;

                    return (
                      <Button
                        key={tab.value}
                        onClick={() => {
                          handleSetTabParam(tab.value);
                          setActiveTab(tab.value);
                        }}
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
              <div className="h-full w-full pl-[30px] mt-5">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isShowActionAnswerModal && (
        <ActionAnswerSurveyModal
          open={isShowActionAnswerModal}
          isMySurvey={isMySurvey || mySurvey ? true : false}
          detailId={surveyId || surveyDetailId}
          handleAnswerSurvey={handleAnswerSurvey}
          onClose={() => {
            handleRemoveParam();
            setIsShowActionAnswerModal(false);
          }}
        />
      )}
      {openSettingSurvey && (
        <ActionSettingSurvey
          open={openSettingSurvey}
          onSuccess={(title: string) => {
            const doc = new DOMParser().parseFromString(title, 'text/html');
            const paragraphs = doc.querySelectorAll('p');

            if (paragraphs.length > 0) {
              // Insert 【 at start of first <p>
              paragraphs[0].innerHTML = `【${paragraphs[0].innerHTML}`;
              // Insert 】 at end of last <p>
              paragraphs[paragraphs.length - 1].innerHTML =
                `${paragraphs[paragraphs.length - 1].innerHTML}】アンケート実施中！ぜひご協力ください！`;
            }
            setTweetMessage(doc.body.innerHTML);
            const activeTabValue = mapping[activeTab];
            setOpenSettingSurvey(false);
            setOpenSuccessSurvey(true);
            if (activeTab !== TabTypeSurvey.ENDED) {
              refreshSurveyList(activeTabValue);
            }
          }}
          onClose={() => setOpenSettingSurvey(false)}
        />
      )}
      {openSuccessSurvey && (
        <SuccessSurveyActionModal
          open={openSuccessSurvey}
          onClose={() => {
            setOpenSuccessSurvey(false);
            setTweetMessage('');
          }}
          onTweet={() => {
            setOpenSuccessSurvey(false);
            setOpenCreateTweetModal(true);
          }}
        />
      )}
      {openCreateTweetModal && (
        <CreateTweetModal
          open={openCreateTweetModal}
          tweetMessage={tweetMessage}
          isSendTweetSuccess={isSendTweetSuccess}
          setTweetMessage={setTweetMessage}
          onClose={() => {
            setTweetMessage('');
            setOpenCreateTweetModal(false);
          }}
          onSubmit={() => sendTweetMessage({ content: tweetMessage })}
        />
      )}
      {openConfirmDeleteModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          type="アンケート"
          onConfirm={handleConfirmDeleteLocation}
          onClose={() => {
            setOpenConfirmDeleteModal(false);
            setSelectedSurveyToDelete(null);
          }}
        />
      )}
    </>
  );
};

export default SurveyListPage;
