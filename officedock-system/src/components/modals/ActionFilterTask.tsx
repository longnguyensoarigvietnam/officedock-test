import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { CreationDataTask } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { UNREGISTERED } from '@constants';

type ActionTaskFilterProp = {
  creationDataTaskData: CreationDataTask | undefined;
  handleClose: () => void;
};

const ActionFilterTask = ({
  creationDataTaskData,
  handleClose,
}: ActionTaskFilterProp) => {
  const [dataOptionsOrganizations, setDataOptionsOrganizations] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsCategoryIds, setDataOptionsCategoryIds] = useState<
    OptionDropdownType[]
  >([]);

  const { watch, getValues, setValue } = useForm<{
    organizationIds?: OptionDropdownType[];
    tagIds?: OptionDropdownType[];
    categoryIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsOrganizations(
        creationDataTaskData.organizations.map((org) => ({
          label: org.name,
          value: org.id as number,
        })),
      );
      setDataOptionsTagIds(
        creationDataTaskData.tags.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
      setDataOptionsCategoryIds(
        creationDataTaskData.categories.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationDataTaskData]);

  return (
    <>
      <div className="w-full pt-[10px] pl-5 pr-[10px] pb-5 bg-white rounded-lg shadow-common p-1 flex flex-col gap-1 text-sm">
        <div className="text-xs font-medium text-[#77858F] flex justify-between items-center">
          <span>絞り込み</span>
          <div className="flex items-center gap-x-[10px]">
            <span>選択をクリア</span>
            <div
              style={{
                padding: '5px',
              }}
              onClick={() => handleClose()}
              className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
              <ImageRound
                src={`/icons/close-black.svg`}
                name="close"
                className="w-fit h-fit"
              />
            </div>
          </div>
        </div>
        <div className="mt-[10px] flex  flex-col gap-[14px] ">
          {/* Organization */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px]"
              labelClass="!min-h-0"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[324px]"
              options={dataOptionsOrganizations}
              selectedOptions={[]}
              customLabel={
                (watch('organizationIds') ?? []).filter((tag) => tag.value)
                  .length > 0
                  ? `${(watch('organizationIds') ?? []).filter((tag) => tag.value).length}件選択中`
                  : UNREGISTERED
              }
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('organizationIds') || [];
                const foundItemIndex = currentTagIds.findIndex(
                  (tag) => tag.value == selected.value,
                );
                if (foundItemIndex == -1) {
                  updatedTagIds = [...currentTagIds, selected];
                } else {
                  updatedTagIds = currentTagIds.filter(
                    (tag) => tag.value != selected.value,
                  );
                }
                setValue('organizationIds', updatedTagIds);
              }}
            />
          </div>
          {/* Category */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px]"
              labelClass="!min-h-0"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[324px]"
              options={dataOptionsCategoryIds}
              selectedOptions={[]}
              customLabel={
                (watch('categoryIds') ?? []).filter((tag) => tag.value).length >
                0
                  ? `${(watch('categoryIds') ?? []).filter((tag) => tag.value).length}件選択中`
                  : UNREGISTERED
              }
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('categoryIds') || [];
                const foundItemIndex = currentTagIds.findIndex(
                  (tag) => tag.value == selected.value,
                );
                if (foundItemIndex == -1) {
                  updatedTagIds = [...currentTagIds, selected];
                } else {
                  updatedTagIds = currentTagIds.filter(
                    (tag) => tag.value != selected.value,
                  );
                }
                setValue('categoryIds', updatedTagIds);
              }}
            />
          </div>
          {/* TagIds */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px]"
              labelClass="!min-h-0"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[324px]"
              options={dataOptionsTagIds}
              selectedOptions={[]}
              customLabel={
                (watch('tagIds') ?? []).filter((tag) => tag.value).length > 0
                  ? `${(watch('tagIds') ?? []).filter((tag) => tag.value).length}件選択中`
                  : UNREGISTERED
              }
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('tagIds') || [];
                const foundItemIndex = currentTagIds.findIndex(
                  (tag) => tag.value == selected.value,
                );
                if (foundItemIndex == -1) {
                  updatedTagIds = [...currentTagIds, selected];
                } else {
                  updatedTagIds = currentTagIds.filter(
                    (tag) => tag.value != selected.value,
                  );
                }
                setValue('tagIds', updatedTagIds);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ActionFilterTask;
