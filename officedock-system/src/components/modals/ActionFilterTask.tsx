import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { CreationDataTask } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import Button from '@components/common/Button';
import { TaskContext } from '@providers/TaskProvider';

type ActionTaskFilterProp = {
  creationDataTaskData: CreationDataTask | undefined;
  handleClose: () => void;
};

const ActionFilterTask = ({
  creationDataTaskData,
  handleClose,
}: ActionTaskFilterProp) => {
  const { orderingOptions, setOrderingOptions } = useContext(TaskContext);

  const [dataOptionsOrganizations, setDataOptionsOrganizations] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsCategoryIds, setDataOptionsCategoryIds] = useState<
    OptionDropdownType[]
  >([]);

  const { getValues, setValue, watch, reset } = useForm<{
    organizationIds: OptionDropdownType[];
    tagIds: OptionDropdownType[];
    categoryIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  const defaultValues = useMemo<{
    organizationIds: OptionDropdownType[];
    tagIds: OptionDropdownType[];
    categoryIds: OptionDropdownType[];
  }>(() => {
    const value: {
      organizationIds: OptionDropdownType[];
      tagIds: OptionDropdownType[];
      categoryIds: OptionDropdownType[];
    } = {
      tagIds: [],
      categoryIds: [],
      organizationIds: [],
    };

    if (orderingOptions) {
      if (orderingOptions.tag_ids) {
        value.tagIds = orderingOptions.tag_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
      if (orderingOptions.category_ids) {
        value.categoryIds = orderingOptions.category_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
      if (orderingOptions.organization_ids) {
        value.organizationIds = orderingOptions.organization_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
    }
    return value;
  }, [orderingOptions]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

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

  const handleSearch = () => {
    setOrderingOptions({
      category_ids: getValues('categoryIds'),
      tag_ids: getValues('tagIds'),
      organization_ids: getValues('organizationIds'),
    });
  };

  return (
    <>
      <div className="w-full pt-[10px] pl-5 pr-[10px] pb-5 bg-white rounded-lg shadow-common p-1 flex flex-col gap-1 text-sm">
        <div className="text-xs font-medium text-[#77858F] flex justify-between items-center">
          <span>絞り込み</span>
          <div className="flex items-center gap-x-[10px]">
            <span onClick={() => reset()} className="cursor-pointer">
              選択をクリア
            </span>
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
              selectedOptions={watch('organizationIds') ?? []}
              customLabel="チーム"
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
              selectedOptions={watch('categoryIds') ?? []}
              customLabel="カテゴリー"
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
              selectedOptions={watch('tagIds') ?? []}
              customLabel="タグ"
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
        <div className="flex justify-end mt-4">
          <Button onClick={handleSearch} className="h-8">
            絞り込み
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActionFilterTask;
