'use client';

import React, { useContext, useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import RadioButtonSingle from '@components/common/RadioButton/CustomRadioButton';
import ActionAddCreditCardModal from '@components/modals/credit-card/ActionAddCreditCardModal';
import useGetListPaymentCard from '@hooks/useGetListPaymentCard';
import { apiRouters } from '@constants/routers';
import api from '@base/api';
import { useMutation } from 'react-query';
import ConfirmDeletePaymentModal from '@components/modals/credit-card/ConfirmDeletePaymentModal';
import { useUpdatePaymentCardCache } from '@hooks/CacheQuery/useUpdatePaymentCardCache';
import { useToast } from '@providers/ToastProvider';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { LoadingContext } from '@providers/LoadingProvider';
import { PaymentMethod } from '@interfaces/payment';

const PaymentDetail = () => {
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);

  // STATE
  const [openAddCard, setOpenAddCard] = useState(false);
  const [openDeleteCardModal, setOpenDeleteCardModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { paymentList } = useGetListPaymentCard();
  const { removePaymentCard, updateDefaultCard, addCardPayment } =
    useUpdatePaymentCardCache();

  const handleRemovePaymentCard = async (id: number) => {
    setIsLoading(true);
    return await api.delete(apiRouters.REMOVE_CARD(id));
  };

  // Handle remove card
  const { mutate: removeCard } = useMutation(
    'handleRemovePaymentCard',
    handleRemovePaymentCard,
    {
      onSuccess: async () => {
        removePaymentCard(selectedCardId?.id as number);
        setOpenDeleteCardModal(false);
        setSelectedCardId(null);
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
      },
      onError: () => {
        showToast({
          description: ERROR_DELETE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmDeleteCard = () => {
    removeCard(selectedCardId?.id as number);
  };

  const handleChangePaymentCardDefault = async (id: number) => {
    setIsLoading(true);
    return await api.post(apiRouters.SET_DEFAULT_CARD(id));
  };

  // Handle change card default
  const { mutate: changeCardDefault } = useMutation(
    'handleChangePaymentCardDefault',
    handleChangePaymentCardDefault,
    {
      onSuccess: async (card, id) => {
        updateDefaultCard(id);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: () => {
        showToast({
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  return (
    <>
      <div>
        <p className="font-medium text-[26px]">お支払い管理</p>
        {/* History payment */}
        <div className="mt-[30px] bg-[#F8FAFC] rounded-[30px] p-[30px]">
          <p className="text-[18px] font-medium">契約履歴</p>
          <div className="mt-10 flex flex-col gap-8">
            <div className="flex items-center gap-5 ">
              <p className="w-[100px] text-[#77858F] font-medium text-sm">
                契約プラン
              </p>
              <p className="text-black font-medium text-base">1〜10人プラン</p>
            </div>
            <div className="h-[1px] bg-[#D2DBE1]"> </div>
            {/* Date start */}
            <div className="flex items-center gap-5 ">
              <p className="w-[100px] text-[#77858F] font-medium text-sm">
                契約期間
              </p>
              <p className="text-black font-medium text-base">2026年9月</p>
            </div>
            <div className="h-[1px] bg-[#D2DBE1]"> </div>
            {/* Date end */}
            <div className="flex items-center gap-5 ">
              <p className="w-[100px] text-[#77858F] font-medium text-sm">
                契約更新予定日
              </p>
              <p className="text-black font-medium text-base">2026年9月</p>
            </div>
          </div>
        </div>
        {/* Payment method */}
        <div className="mt-5 bg-[#F8FAFC] rounded-[30px] p-[30px]">
          <div className="flex items-center justify-between">
            <p className="text-[18px] font-medium">お支払い方法</p>
            <Button
              onClick={() => setOpenAddCard(true)}
              className="flex gap-2 !p-[10px] h-[34px]">
              <div
                className={`rounded-full cursor-pointer w-4 h-4 flex items-center justify-center  bg-white `}>
                <ImageRound
                  src={`/icons/add.svg`}
                  name="Add"
                  style={{
                    width: `8px`,
                    height: `8px`,
                  }}
                />
              </div>
              <p> 新規カード情報登録</p>
            </Button>
          </div>
          <div className="flex items-center gap-5 mt-10 ">
            <p className="w-[100px] text-[#77858F] font-medium text-sm">
              お支払い方法
            </p>
            <p className="text-black font-medium text-base">クレジットカード</p>
          </div>
          {/* List card */}
          <div className="mt-10 flex flex-col gap-5">
            {paymentList?.results.map((card) => (
              <div
                key={card.id}
                className="rounded-[10px] border border-[#D2DBE1] overflow-hidden">
                <div className="border-b border-[#D2DBE1] flex items-center gap-4 p-[18px]">
                  <p className="text-xs font-medium text-[#77858F]">
                    クレジットカード情報 1
                  </p>
                  {paymentList?.results.length > 1 && (
                    <ImageRound
                      onClick={() => {
                        setOpenDeleteCardModal(true);
                        setSelectedCardId({
                          id: card.id,
                          name: card.last4,
                        });
                      }}
                      src={`/icons/delete-gray-bold.svg`}
                      name="delete"
                      className="w-fit h-fit hover:opacity-70 cursor-pointer"
                    />
                  )}
                </div>
                <div className="flex items-center bg-white border-b border-[#D2DBE1]">
                  <div className="w-[319px] border-r border-[#D2DBE1] py-9 px-[18px]">
                    カード会社
                  </div>
                  <div className="flex-grow py-9 px-[18px] break-all">
                    {card.brand}
                  </div>
                </div>
                <div className="flex items-center bg-white border-b border-[#D2DBE1]">
                  <div className="w-[319px] border-r border-[#D2DBE1] py-9 px-[18px]">
                    カード番号
                  </div>
                  <div className="flex-grow py-9 px-[18px] break-all">
                    ************{card.last4}
                  </div>
                </div>
                <div className="flex items-center bg-white ">
                  <div className="w-[319px] border-r border-[#D2DBE1] py-9 px-[18px]">
                    メイン設定
                  </div>
                  <div className="flex-grow py-9 px-[18px] break-all">
                    <RadioButtonSingle
                      option={{
                        label:
                          '選択したカードが、次回以降の決済時に優先して使用される',
                        value: 'experience',
                      }}
                      checked={card.isDefault}
                      onChange={() => {
                        changeCardDefault(card.id);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {openAddCard && (
        <ActionAddCreditCardModal
          open={openAddCard}
          onClose={() => setOpenAddCard(false)}
          onCreate={(newCard: PaymentMethod) => {
            addCardPayment(newCard);
          }}
        />
      )}
      {openDeleteCardModal && selectedCardId && (
        <ConfirmDeletePaymentModal
          name={selectedCardId.name}
          open={openDeleteCardModal}
          onConfirm={handleConfirmDeleteCard}
          onClose={() => {
            setOpenDeleteCardModal(false);
            setSelectedCardId(null);
          }}
        />
      )}
    </>
  );
};

export default PaymentDetail;
