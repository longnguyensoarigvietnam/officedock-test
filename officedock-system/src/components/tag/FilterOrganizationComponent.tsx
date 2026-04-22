import Button from '@components/common/Button';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { OptionDropdownType } from '@interfaces/common';

export const FilterOrganizationComponent = ({
  dataOrganizationList,
  selectedOptions,
  onChange,
  onSubmit,
  onClose,
}: {
  dataOrganizationList: OptionDropdownType[];
  selectedOptions: OptionDropdownType[];
  onChange: (selected: OptionDropdownType) => void;
  onSubmit: () => void;
  onClose: () => void;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-common flex flex-col items-center w-[330px] py-5">
      <div className="w-[300px]">
        <MultiSelectDropdown
          className="!h-[34px] !rounded-md"
          labelClass="!min-h-0 !text-sm font-medium"
          valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
          optionClassName="!border-[1px] !border-[#77858F] w-full"
          labelOptionClass="break-words max-w-[300px]  !text-sm"
          optionsCheckBoxClassName="!max-w-[300px]"
          options={dataOrganizationList}
          selectedOptions={selectedOptions}
          customLabel="チーム"
          onChange={(selected) => {
            onChange(selected);
          }}
        />
      </div>
      <div className="flex justify-center gap-[10px] mt-4 ">
        <Button variant="outline" onClick={onClose} className="h-9">
          キャンセル
        </Button>
        <Button onClick={onSubmit} className="h-9">
          絞り込む
        </Button>
      </div>
    </div>
  );
};
