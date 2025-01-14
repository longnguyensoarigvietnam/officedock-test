'use client';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE, UNREGISTERED } from '@constants/message';
import useDetailUser from '@hooks/useDetailUser';

import { useToast } from '@providers/ToastProvider';

const UserDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { userDetail } = useDetailUser({
    userId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.USERS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  return (
    <div className="w-full bg-white flex flex-col gap-4">
      <ViewInfo label="名前">
        {userDetail?.profile?.fullName || UNREGISTERED}
      </ViewInfo>
      <ViewInfo label="メールアドレス">{userDetail?.email} </ViewInfo>
    </div>
  );
};

export default UserDetail;
