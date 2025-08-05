'use client';
import { memo, useEffect, useState } from 'react';

import Modal from '@components/common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import PeopleDropdown from '@components/common/Dropdown/PeopleDropdown';

import { SkillMapLevelUp, SubmitLevelUpRequest } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import { SKILL_MAP_STEPS } from '@constants';
import { SubmitLevelStatus } from '@constants/enums';

import { getLastChar } from '@utils';

export type SubmitLevelUpModalProps = {
  open: boolean;
  submitLevelUpDetail: SkillMapLevelUp & {
    staffId: number;
  };
  isSuccessSubmitLevelUp: boolean;
  onCloseAndSave: (data: SubmitLevelUpRequest) => void;
  onClose: () => void;
  onSubmitLevelUp: (data: SubmitLevelUpRequest) => void;
};

const SubmitLevelUpModal = memo(
  ({
    open,
    submitLevelUpDetail,
    isSuccessSubmitLevelUp = false,
    onCloseAndSave,
    onClose,
    onSubmitLevelUp,
  }: SubmitLevelUpModalProps) => {
    const [itemStatusList, setItemStatusList] = useState<
      {
        item: string;
        isChecked: boolean;
        id: number;
      }[]
    >(
      submitLevelUpDetail.items
        ? submitLevelUpDetail.items.map((item, index) => {
            return {
              item: item.item,
              isChecked: item.isChecked,
              id: index,
            };
          })
        : [],
    );
    const [approverOptions, setApproverOptions] = useState<
      OptionDropdownType[]
    >([]);
    const [selectedApproverId, setSelectedApproverId] = useState<number | null>(
      null,
    );
    const [showApproverErrorValidation, setShowApproverErrorValidation] =
      useState<boolean>(false);

    useEffect(() => {
      if (submitLevelUpDetail) {
        setApproverOptions(
          submitLevelUpDetail.approvers.map((approver) => {
            return {
              imgUrl: approver?.avatar || '',
              iconColor: approver.avatarColor,
              label: approver.profile.fullName,
              value: approver.id,
            };
          }),
        );
        if (submitLevelUpDetail.approver) {
          setSelectedApproverId(submitLevelUpDetail.approver.id);
        }
      }
    }, [submitLevelUpDetail]);

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[8px] text-gray-700 !p-0 w-[400px] "
        contentClass="!w-[400px] !rounded-[8px]"
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-5 items-center">
          <p className="text-black font-medium text-[18px] max-w-full break-all text-center">
            {submitLevelUpDetail.skill.name}
          </p>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center justify-center w-full gap-2">
              <div className="bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                <p
                  className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(submitLevelUpDetail.stepBeforeSubmit),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP {getLastChar(submitLevelUpDetail.stepBeforeSubmit)}
                </p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(submitLevelUpDetail.levelBeforeSubmit)}
                  </p>
                </div>
              </div>
              <ImageRound
                className="w-fit h-fit"
                src="/icons/blue-chevron.svg"
                name="Blue chevron"
              />
              <div className="relative bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                <p
                  className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(submitLevelUpDetail.stepAfterSubmit),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP {getLastChar(submitLevelUpDetail.stepAfterSubmit)}
                </p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(submitLevelUpDetail.levelAfterSubmit)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isSuccessSubmitLevelUp ? (
            <>
              <p className="text-sm font-medium">
                レベルアップの申請を行いました
              </p>
              <p
                className="text-primary font-medium text-[13px] hover:cursor-pointer"
                onClick={onClose}>
                閉じる
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">レベルアップが目の前です！</p>
              <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
                <p className="text-primary font-medium text-[16px] text-center mb-3">
                  振り返ってみましょう
                </p>
                <div className="flex flex-col gap-2 justify-start">
                  {submitLevelUpDetail.items &&
                    submitLevelUpDetail.items.length > 0 &&
                    submitLevelUpDetail.items.map((item, index) => {
                      return (
                        <div key={index} className="flex gap-2">
                          <Checkbox
                            classLabel="text-black text-sm font-medium !max-w-full !break-all"
                            label={item.item}
                            onChange={() => {
                              setItemStatusList((prev) =>
                                prev.map((itemWithStatus) => {
                                  if (
                                    itemWithStatus.item === item.item &&
                                    itemWithStatus.id == index
                                  ) {
                                    return {
                                      ...itemWithStatus,
                                      isChecked: !itemWithStatus.isChecked,
                                    };
                                  }
                                  return itemWithStatus;
                                }),
                              );
                            }}
                            isChecked={
                              itemStatusList.find(
                                (itemWithStatus) =>
                                  itemWithStatus.item == item.item &&
                                  itemWithStatus.id == index,
                              )?.isChecked
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="flex w-full flex-col gap-1 justify-start">
                <p className="text-xs font-medium text-[#77858F]">
                  申請を送るメンバー
                </p>
                <div className="w-full">
                  <PeopleDropdown
                    className={`h-[34px] w-full !py-1 text-xs !border-[1px] ${showApproverErrorValidation ? '!border-error' : '!border-[#77858F]'} rounded-md`}
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    classNameError="!text-xs"
                    options={approverOptions}
                    selectedOption={approverOptions.find(
                      (element) => element.value == selectedApproverId,
                    )}
                    iconSize={24}
                    onChange={(e) => {
                      setSelectedApproverId(Number(e.value));
                      setShowApproverErrorValidation(false);
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-5">
                <Button
                  variant="outline"
                  className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-primary bg-white"
                  onClick={() => {
                    onCloseAndSave({
                      staffId: submitLevelUpDetail.staffId,
                      organizationId: submitLevelUpDetail.organization,
                      skillId: submitLevelUpDetail.skill.id,
                      levelBeforeSubmit: submitLevelUpDetail.levelBeforeSubmit,
                      stepBeforeSubmit: submitLevelUpDetail.stepBeforeSubmit,
                      approverId: selectedApproverId,
                      status: SubmitLevelStatus.DRAFT,
                      items: itemStatusList.map((item) => {
                        return {
                          item: item.item,
                          isChecked: item.isChecked,
                        };
                      }),
                      submitLevel: submitLevelUpDetail.submitLevel,
                      skillMapSkillLevel: Number(
                        submitLevelUpDetail.skillMapSkillLevel,
                      ),
                    });
                  }}>
                  保存して閉じる
                </Button>
                <Button
                  variant="primary"
                  disabled={itemStatusList.some((item) => !item.isChecked)}
                  className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-white"
                  onClick={() => {
                    if (!selectedApproverId) {
                      setShowApproverErrorValidation(true);
                      return;
                    }
                    onSubmitLevelUp({
                      staffId: submitLevelUpDetail.staffId,
                      organizationId: submitLevelUpDetail.organization,
                      levelBeforeSubmit: submitLevelUpDetail.levelBeforeSubmit,
                      stepBeforeSubmit: submitLevelUpDetail.stepBeforeSubmit,
                      skillId: submitLevelUpDetail.skill.id,
                      approverId: Number(selectedApproverId),
                      status: SubmitLevelStatus.PENDING,
                      submitLevel: submitLevelUpDetail.submitLevel,
                    });
                  }}>
                  レベルアップ申請
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  },
);

export default SubmitLevelUpModal;
