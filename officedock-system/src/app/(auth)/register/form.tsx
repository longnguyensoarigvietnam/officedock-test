'use client';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import ButtonSSO from '@components/common/ButtonSSO';
import Checkbox from '@components/common/Checkbox';

import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters, pageRouters } from '@constants/routers';
import { emailRules } from '@utils/validators';
import api from '@base/api';
import { ResponseError } from '@interfaces/response';

type RegisterFillType = {
  email: string;
};

const RegisterForm = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();

  const [isRule, setRule] = useState<boolean>(false);

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFillType>({
    mode: 'onSubmit',
  });

  // Handle register
  const userRegisterRequest = async (data: RegisterFillType): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.REGISTER_VERIFY_EMAIL, data);
  };

  const { mutate: userRegisterLogin } = useMutation(
    'postUserRegister',
    userRegisterRequest,
    {
      onSuccess: async (response) => {
        const queryString = new URLSearchParams(response.data).toString();
        const url = `${pageRouters.VERIFY_REGISTER.href}?${queryString}`;
        router.push(url);
      },
      onError: ({ response }: ResponseError<{ email: string }>) => {
        if (response?.data.email) {
          setError('email', { message: response.data.email[0] });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  const onSubmit: SubmitHandler<RegisterFillType> = (data) => {
    setIsLoading(true);
    userRegisterLogin(data);
  };

  return (
    <div className="w-[550px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{pageRouters.REGISTER.name}</h1>
      </div>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Input
            label="メールアドレス"
            placeholder="入力してください"
            autoCompleteInput
            error={errors.email?.message}
            register={register('email', emailRules(true))}
          />
        </div>
        <div className="flex text-sm items-center">
          <Checkbox
            className="!w-fit"
            isChecked={isRule}
            onChange={() => setRule(!isRule)}
          />
          <p>
            サインアップして、
            <Link href={'#'} className="underline text-primary">
              利用規約
            </Link>
            と
            <Link href={'#'} className="underline text-primary">
              プライバシー ポリシー
            </Link>
            に同意します。
          </p>
        </div>
        <Button type="submit" disabled={!isRule}>
          続ける
        </Button>
      </form>
      <div className="flex gap-4 items-center">
        <div className="flex-grow h-[1px] bg-gray-200"></div>
        <p className="text-sm">または</p>
        <div className="flex-grow h-[1px] bg-gray-200"></div>
      </div>
      <div className="flex flex-col w-full gap-2 -mt-2">
        <ButtonSSO provider="google" text="Googleで続ける" />
      </div>
      <div className="flex flex-col justify-center items-center gap-2">
        <div className="flex items-center text-gray-500">
          <p>すでに登録されている方は</p>
          <Link
            href={pageRouters.LOGIN.href}
            className="text-primary underline">
            こちら
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
