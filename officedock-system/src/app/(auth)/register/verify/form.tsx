'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  OTP_CODE_INVALID,
  OTP_CODE_REQUIRED_MESSAGE,
  TOKEN_INVALID,
} from '@constants/message';
import { VerifyOTP } from '@constants/enums';
import { decodeToken, handlePreventInputText } from '@utils';
import api from '@base/api';
import { useToast } from '@providers/ToastProvider';
import { JwtDecode } from '@interfaces/auth';

type VerifyEmailType = {
  token: string;
  otpCode?: string;
};

const VerifyRegisterPage = () => {
  const router = useRouter();
  const [tokenDecoded, setTokenDecode] = useState<JwtDecode>();

  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailType>();

  // Action verify
  const registerVerifyRequest = async (data: VerifyEmailType): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.VERIFY_TOKEN, data);
  };
  // Verify token
  const { mutate: verifyToken } = useMutation(
    'postVerifyTokenEmail',
    registerVerifyRequest,
    {
      onSuccess: async (response) => {
        const { steps } = response.data;
        if (steps === VerifyOTP.OTP) {
          const url = `${pageRouters.FILL_INFO_REGISTER.href}?token=${token}`;
          router.push(url);
        }
        token && setTokenDecode(decodeToken(token));
      },
      onError: () => {
        router.push(pageRouters.REGISTER.href);
        showToast({
          variant: 'error',
          description: TOKEN_INVALID,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  // API register token
  const registerTokenRequest = async (data: VerifyEmailType): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.REGISTER_VERIFY_OTP, data);
  };

  // Register with token
  const { mutate: registerToken } = useMutation(
    'postRegisterTokenEmail',
    registerTokenRequest,
    {
      onSuccess: async (response) => {
        const queryString = new URLSearchParams(response.data).toString();
        const url = `${pageRouters.FILL_INFO_REGISTER.href}?${queryString}`;
        router.push(url);
      },
      onError: () => {
        setError('otpCode', {
          message: OTP_CODE_INVALID,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  useEffect(() => {
    if (token) {
      verifyToken({
        token: token,
      });
    } else {
      router.push(pageRouters.REGISTER.href);
    }
  }, [router, token, verifyToken]);
  const onSubmit: SubmitHandler<VerifyEmailType> = (data): void => {
    setIsLoading(true);
    registerToken({
      ...data,
      token: token as string,
    });
  };
  return (
    <div className="w-[580px] bg-gray-50 rounded-2xl p-6 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-semibold">メールをご確認ください</h1>
      <strong className="text-xl font-semibold">{tokenDecoded?.email}</strong>
      <span className="py-4 text-center border w-full font-medium">
        件名｜【Office Dock】アカウント登録のご案内
      </span>
      <div className="flex flex-col items-center">
        <p className="text-center">
          <strong className="font-semibold">{tokenDecoded?.email}</strong>
          に確認コードを記載したメールを送信しました。
        </p>
        <p>記載されている確認コードを入力してください。</p>
      </div>
      <form
        className="flex flex-col gap-6 w-full"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Input
            autoCompleteInput
            className="no-number-arrows"
            label="確認コード"
            placeholder="確認コードを入力"
            name="otpCode"
            type="text"
            maxLength={6}
            error={errors.otpCode?.message}
            register={register('otpCode', {
              required: OTP_CODE_REQUIRED_MESSAGE,
            })}
            onKeyDown={(e) => handlePreventInputText(e)}
            autoFocus={true}
          />
        </div>
        <div className="flex flex-col w-full gap-2">
          <Button type="submit">続ける</Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>

      <div className="flex flex-col justify-center items-center gap-2">
        <div className="flex items-center text-gray-500">
          <p>※メールが届かない場合は、</p>
          <Link href={'#'} className="text-primary underline">
            サポートページ
          </Link>
          <p>をご確認ください。</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyRegisterPage;
