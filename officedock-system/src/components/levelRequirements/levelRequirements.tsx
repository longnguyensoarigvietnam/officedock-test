'use client';
import Input from '@components/common/Input';
import { OptionDropdownType } from '@interfaces/common';
import { ChangeEvent, memo, useState } from 'react';

export type LevelRequirementsProps = {
  descriptions: OptionDropdownType[];
  onKeyDown: (e: any) => void;
  onDeleteLevelRequirementOption: (e: any) => void;
};

const LevelRequirements = memo(
  ({
    descriptions,
    onKeyDown,
    onDeleteLevelRequirementOption,
  }: LevelRequirementsProps) => {
    const [isSubmit, setIsSubmit] = useState(false);
    const [value, setValue] = useState<string>('');
    const handleOnKeyDown = async (e: any) => {
      setValue('');
      setIsSubmit(false);
      await onKeyDown(e.target.value);
    };
    const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };

    return (
      <>
        <Input
          value={value}
          onBlur={() => {
            setValue('');
          }}
          onChange={(e) => handleOnChange(e)}
          onKeyDown={(e: any) => {
            if (e.keyCode == 13 && e.target.value !== '') {
              if (isSubmit) return;
              setIsSubmit(true);
              handleOnKeyDown(e);
            }
          }}
          className="!w-[420px]"
        />

        <div className="flex flex-wrap justify-start mt-2 gap-2">
          {descriptions &&
            descriptions.map((option, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-200 px-3 py-1 rounded-md text-sm">
                <span className="mr-2 break-words !max-w-[370px]">
                  {option.label}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteLevelRequirementOption(option.value)}
                  className="text-gray-700 hover:text-gray-900">
                  ✕
                </button>
              </div>
            ))}
        </div>
      </>
    );
  },
);

export default LevelRequirements;
