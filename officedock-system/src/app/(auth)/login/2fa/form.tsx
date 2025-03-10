'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { getSession, signIn } from 'next-auth/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { addSeconds, differenceInSeconds } from 'date-fns';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Countdown from '@components/common/Countdown';

import api from '@base/api';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { COUNTDOWN_FOR_RESEND_OTP } from '@constants';
import {
  OTP_CODE_INVALID,
  OTP_CODE_REQUIRED_MESSAGE,
  RESEND_OTP_SUCCESS,
  TOKEN_INVALID,
} from '@constants/message';
import { SYSTEM_PERMISSIONS_MENU } from '@constants/menu';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { handlePreventInputText, handleRemoveText } from '@utils';

type LoginFormInputs = {
  token: string;
  otpCode?: string;
  rememberMe?: boolean;
};

const LoginForm2FA = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const rememberMe = searchParams.get('rememberMe');

  const sendOTPAtRef = useRef<string>('');

  const isReSendOTPRef = useRef<boolean>(false);

  const [acceptToResend, setAcceptToResend] = useState(false);
  const [isSendOTP, setIsSendOTP] = useState(false);

  const [startCountdownAt, setStartCountdownAt] = useState(0);
  const [isClickedInCountdown, setIsClickedInCountdown] = useState(false);

  const { showToast } = useToast();

  const {
    register,
    setError,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  // TODO: Update type data response
  // Handle verify login request
  const loginVerifyRequest = async (data: LoginFormInputs): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.VERIFY_TOKEN, data);
  };
  // Verify token
  const { mutate: verifyToken } = useMutation(
    'postVerifyTokenLogin',
    loginVerifyRequest,
    {
      onSuccess: async () => {},
      onError: () => {
        router.push(pageRouters.LOGIN.href);
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

  // This step to verify login before using next auth
  const { mutate: loginVerify } = useMutation(
    'postLoginVerify',
    loginVerifyRequest,
    {
      onSuccess: async () => {
        sendOTPAtRef.current = new Date().toString();

        setAcceptToResend(false);

        loginOtp({
          token: token as string,
          otpCode: getValues('otpCode'),
          rememberMe: getValues('rememberMe'),
        });
      },
      onError: () => {
        setError('otpCode', { message: OTP_CODE_INVALID });
        setIsLoading(false);
      },
    },
  );

  // We call this one after verification successfully
  const { mutate: loginOtp } = useMutation(
    (data: LoginFormInputs) =>
      signIn('2fa-credentials', {
        ...data,
        rememberMe: rememberMe === 'true' ? true : false,
        redirect: false,
      }),
    {
      onSuccess: async (data) => {
        if (data?.status === ServerStatusCode.OK) {
          const session = await getSession();
          const firstViewPath = SYSTEM_PERMISSIONS_MENU.filter(
            (menu) =>
              session &&
              session.user.permissions.length > 0 &&
              session.user.permissions.includes(menu.requiredPermission),
          ).map((menu) => menu.href)[0];
          if (firstViewPath) {
            router.push(firstViewPath);
          } else {
            router.push(pageRouters.DEFAULT.href);
          }
        }
        if (data?.status === ServerStatusCode.UNAUTHORIZED) {
          setError('otpCode', { message: OTP_CODE_INVALID });
        }
      },
      onError: () => {
        setError('otpCode', { message: OTP_CODE_INVALID });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Resend OTP
  const handleResendOTP = async (): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.LOGIN_RESEND_OTP, { token });
  };
  // Verify token
  const { mutate: resendOTP } = useMutation(
    'handleResendOTP',
    handleResendOTP,
    {
      onSuccess: async () => {
        setAcceptToResend(false);
        sendOTPAtRef.current = new Date().toString();
        showToast({
          variant: 'success',
          description: RESEND_OTP_SUCCESS,
        });
        setIsSendOTP(true);
      },
      onError: () => {
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
  useEffect(() => {
    if (token) {
      verifyToken({
        token: token,
      });
    } else {
      router.push(pageRouters.LOGIN.href);
    }
  }, [router, token, verifyToken]);

  const onSubmit: SubmitHandler<LoginFormInputs> = (data) => {
    setIsLoading(true);
    loginVerify({
      ...data,
      token: token as string,
    });
  };

  const handleReSendOTP = () => {
    if (acceptToResend) {
      isReSendOTPRef.current = true;
      resendOTP();
    } else {
      setIsClickedInCountdown(true);
      setStartCountdownAt(
        differenceInSeconds(
          addSeconds(sendOTPAtRef.current, COUNTDOWN_FOR_RESEND_OTP),
          new Date(),
        ),
      );
    }
  };
  return (
    <div className="w-[500px] rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">ログイン</h1>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <Input
            className="no-number-arrows !border-[#77858F]"
            placeholder="入力してください"
            label="認証コード"
            name="otpCode"
            type="text"
            maxLength={6}
            labelClassName='text-[#77858F] font-medium'
            error={errors.otpCode?.message}
            register={register('otpCode', {
              required: OTP_CODE_REQUIRED_MESSAGE,
            })}
            onKeyDown={(e) => handlePreventInputText(e)}
            onInput={(e) => handleRemoveText(e)}
            onPaste={(e) => handleRemoveText(e)}
            autoFocus={true}
          />
        </div>
        {isSendOTP ? (
          <div className="space-y-3 flex flex-col">
            <div>
              <div className="flex text-[#77858F] text-sm font-medium">
                <p>
                  メールが届かない場合{' '}
                  <Button
                    variant="text"
                    className="!px-2 !py-0"
                    type="button"
                    onClick={handleReSendOTP}>
                    再送信
                  </Button>
                </p>
              </div>
              {startCountdownAt > 0 && isClickedInCountdown ? (
                <p className="pl-1 gap-1 mb-2 mt-2 text-xs text-error flex-center justify-start font-medium">
                  <Countdown
                    second={startCountdownAt}
                    onFinish={() => {
                      setAcceptToResend(true);
                      setIsClickedInCountdown(false);
                    }}
                    templateRender={`連続でボタンを押すことはできません。{second} 秒経過後にもう一度お試しください。`}
                  />
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="flex">
              <p className="text-sm text-[#77858F] font-medium">
                メールが届かない場合{' '}
                <Button
                  variant="text"
                  className="!px-2"
                  type="button"
                  onClick={() => {
                    resendOTP();
                  }}>
                  再送信
                </Button>
              </p>
            </div>
          </>
        )}
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          送信
        </Button>
      </div>
    </div>
  );
};

export default LoginForm2FA;
