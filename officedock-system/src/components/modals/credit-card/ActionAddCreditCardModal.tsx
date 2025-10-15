'use client';

import React, { FormEvent, useContext, useState } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useMutation } from 'react-query';
import { loadStripe } from '@stripe/stripe-js';

import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { ResponseError } from '@interfaces/response';
import { SUCCESS_CREATE_MESSAGE } from '@constants/message';
import ErrorMessage from '@components/common/ErrorMessage';
import { PaymentMethod } from '@interfaces/payment';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#000',
      fontSize: '16px',
      fontFamily: 'sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#fa755a' },
  },
  hidePostalCode: true,
};

const CreditCardForm = ({
  onClose,
  onCreate,
  handleGetClientSecret,
}: {
  onClose: () => void;
  handleGetClientSecret: () => Promise<void>;
  onCreate: (newCard: PaymentMethod) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToast();

  const { setIsLoading, isLoading } = useContext(LoadingContext);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleCreatePaymentMethod = async ({
    stripePaymentMethodId,
  }: {
    stripePaymentMethodId: string | PaymentMethod | null;
  }) => {
    const res = await api.post(apiRouters.ADD_PAYMENT_METHOD, {
      stripePaymentMethodId: stripePaymentMethodId || '',
      paymentMethod: 'クレジットカード',
    });
    return res;
  };

  const { mutate } = useMutation(
    'createPaymentMethod',
    handleCreatePaymentMethod,
    {
      onSuccess: async (res: any) => {
        onCreate(res.data);

        showToast({
          description: SUCCESS_CREATE_MESSAGE,
          variant: 'success',
        });
        onClose();
      },
      onError: ({ response }: ResponseError<{ detail: string }>) => {
        showToast({
          variant: 'error',
          description: response?.data.detail,
        });
      },
      onSettled: () => {
        setIsLoading(false);
        handleGetClientSecret();
      },
    },
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    setIsLoading(true);

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }
    const cardElement = elements.getElement(CardElement);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement!,
      billing_details: {
        address: {
          country: 'JP',
        },
      },
    });

    if (error) {
      setIsLoading(false);
      showToast({
        variant: 'error',
        description: error.message,
      });
      return;
    }

    mutate({ stripePaymentMethodId: paymentMethod.id });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div className="w-full border rounded-lg p-[10px]">
        <CardElement
          options={CARD_ELEMENT_OPTIONS}
          onChange={(event) => {
            setCardComplete(event.complete);
            setCardError(event.error ? event.error.message : null);
          }}
        />
      </div>
      {cardError && <ErrorMessage error={cardError} className="mt-[6px]" />}

      <div className="mt-7 flex justify-center gap-[10px]">
        <Button
          variant="outline"
          onClick={onClose}
          type="button"
          className="bg-transparent w-[100px] rounded-lg h-9 !px-0">
          キャンセル
        </Button>
        <Button
          type="submit"
          className="w-[142px] rounded-lg h-9 !px-0"
          disabled={!stripe || !cardComplete || !!cardError || isLoading}>
          {isLoading ? '登録中...' : 'カード情報を登録'}
        </Button>
      </div>
    </form>
  );
};

export default function ActionAddCreditCardModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (newCard: PaymentMethod) => void;
}) {
  const handleGetClientSecret = async () => {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="font-primary bg-white w-[500px] !rounded-2xl !py-8 px-[44px]">
      <div className="text-[18px] font-medium text-black text-center">
        新規カード情報登録
      </div>
      <Elements
        stripe={stripePromise}
        options={{
          locale: 'ja',
          appearance: {
            theme: 'stripe',
          },
          loader: 'auto',
        }}>
        <CreditCardForm
          onClose={onClose}
          onCreate={onCreate}
          handleGetClientSecret={() => handleGetClientSecret()}
        />
      </Elements>
    </Modal>
  );
}
