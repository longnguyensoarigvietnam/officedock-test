'use client';
import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useParams, useRouter } from 'next/navigation';

import { InformationSection } from '@components/feature/company/detail/InformationSection';
import Button from '@components/common/Button';
import { PaymentInformation } from '@components/feature/company/detail/PaymentInformation';
import { UsageHistory } from '@components/feature/company/detail/UsageHistory';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
  UNREGISTERED,
} from '@constants/message';
import { CompanyStatus, ServerStatusCode } from '@constants/enums';
import {
  JAPAN_DATE_FORMAT,
  JAPAN_DATE_WITH_TIME_FORMAT,
  JAPAN_MONTH_FORMAT,
} from '@constants';

import useCompanyDetail from '@hooks/useDetailCompany';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { renderDate } from '@utils';

import api from '@base/api';

const CompanyDetailInfo = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);

  // Call and handle API get company detail
  const { companyDetail, refetchCompanyDetail } = useCompanyDetail({
    companyId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.COMPANY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  // Active company
  const handleActiveCompany = async () => {
    setIsLoading(true);
    return await api.post(apiRouters.COMPANY_ACTIVE(params.id));
  };

  const { mutate: activeCompany } = useMutation(
    'activeCompany',
    handleActiveCompany,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_SAVE_MESSAGE,
        });
        refetchCompanyDetail();
        setIsLoading(false);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_SAVE_MESSAGE,
        });
        setIsLoading(false);
      },
    },
  );

  // Terminate contract
  const handleTerminateContract = async () => {
    setIsLoading(true);
    return await api.post(apiRouters.TERMINATE_CONTRACT(params.id));
  };

  const { mutate: terminateContract } = useMutation(
    'terminateContract',
    handleTerminateContract,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_SAVE_MESSAGE,
        });
        refetchCompanyDetail();
        setIsLoading(false);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_SAVE_MESSAGE,
        });
        setIsLoading(false);
      },
    },
  );

  return (
    <div className="flex flex-col gap-5 items-center pt-5 w-full">
      <InformationSection
        name="基本情報"
        infoArr={[
          {
            label: 'ID',
            value: companyDetail?.id || 0,
          },
          {
            label: '会社名',
            value: companyDetail?.name || '',
          },
          {
            label: 'ステータス',
            value: companyDetail?.status || '',
          },
        ]}
      />
      <InformationSection
        name="契約情報"
        infoArr={[
          {
            label: '契約プラン',
            value: companyDetail?.plan || '',
          },
          {
            label: '利用開始月',
            value: companyDetail?.contract?.startDate
              ? renderDate(companyDetail.contract.startDate, JAPAN_MONTH_FORMAT)
              : UNREGISTERED,
          },
          {
            label: '次回の更新月',
            value: companyDetail?.contract?.nextRenewalAt
              ? renderDate(
                  companyDetail.contract.nextRenewalAt,
                  JAPAN_MONTH_FORMAT,
                )
              : UNREGISTERED,
          },
          {
            label: '契約終了日',
            value: companyDetail?.contract?.endDate
              ? renderDate(companyDetail.contract.endDate, JAPAN_DATE_FORMAT)
              : UNREGISTERED,
          },
        ]}
      />
      <InformationSection
        name="担当者情報"
        infoArr={[
          {
            label: '担当責任者名',
            value: companyDetail?.contract?.responsiblePersonName || '',
          },
          {
            label: 'メールアドレス',
            value: companyDetail?.contract?.responsiblePersonMail || '',
          },
          {
            label: '電話番号',
            value: companyDetail?.contract?.phone || '',
          },
          {
            label: '住所',
            value: companyDetail?.contract?.address || '',
          },
          {
            label: '業種',
            value: companyDetail?.contract?.industry || '',
          },
        ]}
      />
      <PaymentInformation />
      <InformationSection
        name="ユーザー情報"
        infoArr={[
          {
            label: 'ユーザー数',
            value: companyDetail?.totalUsers || '',
          },
          {
            label: '契約期間中の最大ユーザー数',
            value: companyDetail?.maxUserInContractPeriod || '',
          },
          {
            label: '最大ユーザー数になった日時',
            value: companyDetail?.maxUserAt
              ? renderDate(companyDetail.maxUserAt, JAPAN_DATE_WITH_TIME_FORMAT)
              : UNREGISTERED,
          },
        ]}
      />
      <UsageHistory />
      <InformationSection
        name="その他"
        infoArr={[
          {
            label: 'システム導入の主な目的',
            value: companyDetail?.contract?.systemMainPurpose || '',
          },
          {
            label: '導入の背景にある主な課題',
            value: companyDetail?.contract?.implementationMainIssue || '',
          },
          {
            label: '申込日',
            value: companyDetail?.contract?.createdAt
              ? renderDate(companyDetail.contract.createdAt, JAPAN_DATE_FORMAT)
              : UNREGISTERED,
          },
        ]}
      />

      {/* Buttons */}
      <div className="w-full flex gap-3 mt-5 justify-end">
        {companyDetail?.status == CompanyStatus.PENDING_APPROVAL ? (
          <Button
            variant="secondary"
            className="!w-[135px] !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent"
            onClick={() => activeCompany()}>
            アカウント発行
          </Button>
        ) : (
          <></>
        )}
        {companyDetail?.status == CompanyStatus.CONTRACT_TERMINATED ? (
          <Button
            variant="secondary"
            className="!w-[135px] !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent">
            アカウント復元
          </Button>
        ) : (
          <></>
        )}
        {companyDetail?.status != CompanyStatus.CANCELLATION_PENDING ? (
          <Button
            variant="secondary"
            className="w-28 !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent"
            onClick={() => terminateContract()}>
            解約予約
          </Button>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default CompanyDetailInfo;
