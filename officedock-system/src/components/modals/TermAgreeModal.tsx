'use client';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import 'react-quill/dist/quill.snow.css';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { AxiosError } from 'axios';

import Checkbox from '@components/common/Checkbox';
import Heading from '@components/common/Heading';
import Modal from '../common/Modal';
import Button from '../common/Button';

import { apiRouters } from '@constants/routers';
import { TermType } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import useTermList from '@hooks/useTermList';
import { TermsStep } from '@interfaces/user';
import { LoadingContext } from '@providers/LoadingProvider';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const TermAgreeModal = memo(() => {
  const { data: session, update } = useSessionCache();
  const scrollRef = useRef<HTMLDivElement>(null);
  const showErrorToast = useErrorToast();

  const { setIsLoading } = useContext(LoadingContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [termsSteps, setTermsSteps] = useState<TermsStep[]>([]);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  useTermList({
    conditions: [Boolean(session?.user.unreadTerms?.length)],
    onSuccess: (data) => {
      if (session?.user.unreadTerms && data) {
        const unacceptedTerms = data
          .filter((term) =>
            session?.user.unreadTerms?.find(
              (sessionTerm) => sessionTerm.id == term.id,
            ),
          )
          .filter((term) => {
            if (!term.isAccepted) {
              const description = data.find(
                (item) => item.id == term.id,
              )?.description;
              return {
                ...term,
                isAccepted: false,
                description: description,
              };
            }
          });
        setTermsSteps(unacceptedTerms);
      } else {
        setTermsSteps([]);
      }
    },
  });
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  const handleConfirmReadTerm = async (termData: {
    idTerm: string;
    updatedTermsSteps: TermsStep[];
  }) => {
    const apiUrl = `${apiRouters.READ_TERM(termData.idTerm)}`;
    const { data } = await api.post(apiUrl);
    return data;
  };

  const { mutateAsync: postConfirmReadTerm } = useMutation(
    'postConfirmReadTerm',
    handleConfirmReadTerm,
    {
      onSuccess: (_data, { updatedTermsSteps }) => {
        setTermsSteps(updatedTermsSteps);
        setCurrentStep((prevStep) => prevStep + 1);
        setIsChecked(false);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {},
    },
  );
  // Handle confirm Term
  const handleConfirmStep = async () => {
    if (currentStep < termsSteps.length) {
      setIsLoading(true);
      const idTerm = termsSteps[currentStep].id;

      const updatedTermsSteps = termsSteps.map((step, index) =>
        index === currentStep ? { id: step.id, isAccepted: true } : step,
      );

      const newTermsSteps = updatedTermsSteps.map((item) => {
        return { id: item.id, isAccepted: item.isAccepted ? true : false };
      });

      const response = await fetch('/api/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsSteps: newTermsSteps }),
      });

      if (response.ok) {
        const updatedSession = await response.json();
        if (updatedSession.session) {
          await Promise.all([
            postConfirmReadTerm({ idTerm: `${idTerm}`, updatedTermsSteps }),
            update(updatedSession.session),
          ]);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  };

  if (currentStep >= termsSteps.length) return null;

  return (
    <Modal
      open={true}
      sz="full"
      className="font-primary bg-white w-full h-[90vh] relative z-[9999999] !rounded-2xl !py-4"
      onClose={() => {}}
      overlayClassName="flex justify-center items-center"
      fixedClass="!z-[50]"
      showIconClose={false}>
      <header className="flex  border-b pb-4  border-solid border-gray-100 justify-between items-center mb-4">
        <Heading
          className="leading-10 !text-[#374151] text-lg min-h-[28px]"
          as="h1">
          {termsSteps[currentStep].title}
        </Heading>
      </header>
      <div
        ref={scrollRef}
        className="custom-quill-text text-sm w-full text-gray-700 min-h-[78vh] max-h-[78vh] overflow-y-auto leading-6 text-neutral-02 text-neutral-02 gap-4 flex flex-col justify-between quill-editor ql-editor">
        <div
          dangerouslySetInnerHTML={{
            __html: termsSteps[currentStep].description
              ? `${termsSteps[currentStep].description}`
              : '',
          }}></div>
        <div className="pt-3">
          <Checkbox
            classSize={`w-5 h-5 cursor-pointer `}
            label={
              termsSteps[currentStep].type == TermType.TERM_OF_USE
                ? '利用規約を全部読みました。'
                : 'プライバシーポリシーを全部読みました。'
            }
            isChecked={isChecked}
            onChange={(state) => {
              setIsChecked(state);
            }}
          />
          <div className="border-t mt-4 pt-4 border-solid border-gray-100 gap-4 flex justify-end">
            <Button
              variant="primary"
              disabled={!isChecked}
              onClick={handleConfirmStep}
              className={`w-[107px] rounded-xl h-10`}>
              同意する
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default TermAgreeModal;
