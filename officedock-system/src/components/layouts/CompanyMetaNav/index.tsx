'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import LegalContentModal from '@components/modals/LegalContentModal';

import useLegalList from '@hooks/useLegalList';

import { LegalContentType } from '@constants/enums';

import { TermsStep } from '@interfaces/user';

export const CompanyMetaNav = () => {
  const [termContent, setTermContent] = useState<TermsStep | null>(null);
  const [policyContent, setPolicyContent] = useState<TermsStep | null>(null);

  const [requestedType, setRequestedType] = useState<LegalContentType | null>(
    null,
  );

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();
  const typeParam = searchParams.get('type');

  useLegalList({
    onSuccess: (data) => {
      const termInfo = data.find(
        (item) => item.type == LegalContentType.TERM_OF_USE,
      );
      const policyInfo = data.find(
        (item) => item.type == LegalContentType.PRIVACY_POLICY,
      );
      setTermContent(termInfo || null);
      setPolicyContent(policyInfo || null);
    },
  });

  const handleClick = (type: LegalContentType) => {
    setRequestedType(type);
    handleSetParam(type);
  };

  const handleSetParam = (type: LegalContentType) => {
    if (type) {
      params.set('type', type);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('type');
    router.replace(`?${params.toString()}`);
  };

  const showModal = Boolean(
    requestedType &&
      typeParam &&
      (requestedType == LegalContentType.TERM_OF_USE
        ? termContent
        : policyContent),
  );

  useEffect(() => {
    if (typeParam && !requestedType) {
      setRequestedType(typeParam as LegalContentType);
    }
  }, [typeParam, requestedType]);

  return (
    <>
      <div className="flex flex-grow flex-col justify-center items-center ">
        <Image
          width={200}
          height={200}
          src="/images/officedock_logo_white.svg"
          alt="Officedock logo"
        />
      </div>
      <div className="flex flex-col text-white items-center gap-3">
        <p className="font-medium text-sm">
          <span
            className={`${termContent && 'hover:cursor-pointer'}`}
            onClick={() =>
              termContent && handleClick(LegalContentType.TERM_OF_USE)
            }>
            利用規約
          </span>
          ｜
          <span
            className={`${policyContent && 'hover:cursor-pointer'}`}
            onClick={() =>
              policyContent && handleClick(LegalContentType.PRIVACY_POLICY)
            }>
            個人情報保護方針
          </span>
          ｜<span>お問い合わせ</span>
        </p>
        <p className="font-normal text-xs">@OFFICEDOCK</p>
      </div>
      {showModal && (
        <LegalContentModal
          open={showModal}
          legalContent={
            requestedType == LegalContentType.TERM_OF_USE
              ? termContent
              : policyContent
          }
          onClose={() => {
            handleRemoveParam();
            setRequestedType(null);
          }}
        />
      )}
    </>
  );
};
