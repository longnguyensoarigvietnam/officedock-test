'use client';
import { useMutation } from 'react-query';
import { useContext, useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  COMPANY_NAME_REGISTER_REQUIRED_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  FULL_NAME_REQUIRED_MESSAGE,
  PASSWORD_NOT_MATCHED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  TOKEN_INVALID,
} from '@constants/message';
import { VerifyOTP } from '@constants/enums';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { decodeToken } from '@utils';
import { passwordRegisterRules } from '@utils/validators';
import { JwtDecode } from '@interfaces/auth';
import api from '@base/api';

type FillInfoRegisterType = {
  fullName: string;
  user: {
    email: string;
    password: string;
    confirmPassword?: string;
  };
  company: {
    name: string;
  };
  token: string;
};
type VerifyTokenType = {
  token: string;
};

const FillInfoRegisterForm = () => {
  const router = useRouter();
  const [tokenDecoded, setTokenDecode] = useState<JwtDecode>();

  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const {
    watch,
    trigger,
    register,
    setError,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FillInfoRegisterType>();

  // Action verify
  const registerVerifyRequest = async (data: VerifyTokenType): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.VERIFY_TOKEN, data);
  };
  // Verify token
  const { mutate: verifyToken } = useMutation(
    'postVerifyTokenEmailInfo',
    registerVerifyRequest,
    {
      onSuccess: async (response) => {
        const { steps } = response.data;
        if (steps === VerifyOTP.EMAIL) {
          const url = `${pageRouters.VERIFY_REGISTER.href}?token=${token}`;
          router.push(url);
        }
        token && setTokenDecode(decodeToken(token));
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: TOKEN_INVALID,
        });
        router.push(pageRouters.REGISTER.href);
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

  // API register
  const postRegisterRequest = async (data: FillInfoRegisterType) => {
    const { data: response } = await api.post(apiRouters.REGISTER, data);
    return response;
  };

  const { mutate: registerRequest } = useMutation(
    'postRegisterInfo',
    postRegisterRequest,
    {
      onSuccess: async () => {
        reset();
        showToast({
          variant: 'success',
          description: SUCCESS_UPDATE_MESSAGE,
        });
        router.push(pageRouters.LOGIN.href);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  //Verify password
  const handleNewPasswordRegister = (event: any) => {
    if (watch('user.confirmPassword')) {
      setError('user.confirmPassword', {
        type: 'validate',
        message:
          event.target.value == watch('user.confirmPassword')
            ? ''
            : PASSWORD_NOT_MATCHED_MESSAGE,
      });
      trigger('user.confirmPassword');
    }
  };
  const handleConfirmPassword = (event: any) => {
    if (watch('user.password')) {
      setError('user.confirmPassword', {
        type: 'validate',
        message:
          event.target.value == watch('user.password')
            ? ''
            : PASSWORD_NOT_MATCHED_MESSAGE,
      });
      trigger('user.confirmPassword');
    }
  };

  const onSubmit: SubmitHandler<FillInfoRegisterType> = (data) => {
    setIsLoading(true);
    registerRequest({
      ...data,
      user: {
        password: data.user.password,
        email: tokenDecoded ? tokenDecoded.email : '',
      },
      token: token ? token : '',
    });
  };
  return (
    <div className="w-[500px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">
          {pageRouters.FILL_INFO_REGISTER.name}
        </h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            <label>メールアドレス</label>
            <p className="mt-1"> {tokenDecoded?.email}</p>
          </div>
          <Input
            label="氏名"
            autoCompleteInput
            placeholder="氏名を入力"
            name="fullName"
            error={errors.fullName?.message}
            register={register('fullName', {
              required: FULL_NAME_REQUIRED_MESSAGE,
            })}
          />
          <Input
            label="会社名"
            placeholder="会社名を入力"
            autoCompleteInput
            name="company.name"
            error={errors.company?.name?.message}
            register={register('company.name', {
              required: COMPANY_NAME_REGISTER_REQUIRED_MESSAGE,
            })}
          />
          <Input
            label="パスワード"
            type="password"
            autoCompleteInput
            placeholder="パスワードを入力"
            name="user.password"
            error={errors.user?.password?.message}
            register={register('user.password', {
              ...passwordRegisterRules(true),
              onChange: (event) => {
                handleNewPasswordRegister(event);
              },
              validate: (value) => {
                const confirmPassword = watch('user.confirmPassword');
                return value === confirmPassword;
              },
            })}
          />
          <Input
            label="パスワード"
            type="password"
            autoCompleteInput
            requireText="(確認のためもう一度入力お願いします)"
            placeholder="パスワードを入力"
            labelClassName="[&>span]:!text-gray-700"
            name="user.confirmPassword"
            error={errors.user?.confirmPassword?.message}
            register={register('user.confirmPassword', {
              ...passwordRegisterRules(true),
              validate: (value) => {
                const newPassword = watch('user.password');
                return value === newPassword || PASSWORD_NOT_MATCHED_MESSAGE;
              },
              onChange: (event) => {
                handleConfirmPassword(event);
              },
            })}
          />
        </div>
        <Button type="submit">続ける</Button>
      </form>
    </div>
  );
};

export default FillInfoRegisterForm;
