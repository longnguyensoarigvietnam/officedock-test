'use client';
import { useContext, useState } from 'react';
import { AxiosError } from 'axios';
import { useMutation, useQueryClient } from 'react-query';
import { useParams, useRouter } from 'next/navigation';

import { InformationSection } from '@components/feature/company/detail/InformationSection';
import Button from '@components/common/Button';
import { PaymentInformation } from '@components/feature/company/detail/PaymentInformation';
import { UsageHistory } from '@components/feature/company/detail/UsageHistory';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
  UNREGISTERED,
} from '@constants/message';
import {
  CompanyStatus,
  CompanyTransactionType,
  ServerStatusCode,
} from '@constants/enums';
import {
  JAPAN_DATE_FORMAT,
  JAPAN_DATE_WITH_TIME_FORMAT,
  JAPAN_YEAR_MONTH_FORMAT,
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
  const [openConfirmTerminateModal, setOpenConfirmTerminateModal] =
    useState(false);
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({
          queryKey: ['getCompanyTransactionList', CompanyTransactionType.PLAN],
        });

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
        setOpenConfirmTerminateModal(false);
        setIsLoading(false);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_SAVE_MESSAGE,
        });
        setOpenConfirmTerminateModal(false);
        setIsLoading(false);
      },
    },
  );

  const handleOpenTerminateModal = () => {
    setOpenConfirmTerminateModal(true);
  };

  return (
    <div className="flex flex-col gap-5 items-center pt-5 pl-1 w-[calc(100%_-_10px)]">
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
          {
            label: '締日',
            value: `${companyDetail ? companyDetail?.closeDate : ''}日` || '',
          },
          {
            label: '修正可能期間',
            value:
              `${companyDetail ? companyDetail.editableAfterClosing : ''}日間` ||
              '',
          },
        ]}
      />
      <InformationSection
        name="契約情報"
        infoArr={[
          {
            label: '契約プラン',
            value: companyDetail?.plan?.name || '',
          },
          {
            label: '利用開始月',
            value: companyDetail?.contract?.startDate
              ? renderDate(
                  companyDetail.contract.startDate,
                  JAPAN_YEAR_MONTH_FORMAT,
                )
              : UNREGISTERED,
          },
          {
            label: '次回の更新月',
            value: companyDetail?.contract?.nextRenewalAt
              ? renderDate(
                  companyDetail.contract.nextRenewalAt,
                  JAPAN_YEAR_MONTH_FORMAT,
                )
              : UNREGISTERED,
          },
          {
            label: '契約終了日',
            value:
              companyDetail?.status == CompanyStatus.CANCELLATION_PENDING ||
              companyDetail?.status == CompanyStatus.CONTRACT_TERMINATED
                ? companyDetail?.contract?.endDate
                  ? renderDate(
                      companyDetail.contract.endDate,
                      JAPAN_DATE_FORMAT,
                    )
                  : ''
                : '',
          },
        ]}
      />
      <InformationSection
        name="担当者情報"
        infoArr={[
          {
            label: '担当責任者名',
            value: companyDetail?.responsiblePersonName || '',
          },
          {
            label: 'メールアドレス',
            value: companyDetail?.responsiblePersonMail || '',
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
      <PaymentInformation paymentMethod={companyDetail?.paymentMethod || ''} />
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
            value: companyDetail?.contract?.systemMainPurpose?.join('／') || '',
          },
          {
            label: '利用部門',
            value: companyDetail?.contract?.department?.join('／') || '',
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
        {companyDetail?.status == CompanyStatus.ACTIVE_CONTRACT ? (
          <Button
            variant="secondary"
            className="w-28 !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent"
            onClick={handleOpenTerminateModal}>
            解約予約
          </Button>
        ) : (
          <></>
        )}
      </div>

      <ConfirmDeleteModal
        open={openConfirmTerminateModal}
        type=""
        customMessage="本当に解約予約を行いますか？"
        onConfirm={terminateContract}
        onClose={() => setOpenConfirmTerminateModal(false)}
      />
    </div>
  );
};

export default CompanyDetailInfo;
