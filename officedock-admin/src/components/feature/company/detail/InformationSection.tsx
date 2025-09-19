import ViewInfo from '@components/common/ViewInfo';

import { OptionDropdownType } from '@interfaces/common';

export const InformationSection = ({
  name,
  infoArr,
}: {
  name: string;
  infoArr: OptionDropdownType[];
}) => {
  return (
    <div className="w-full flex flex-col gap-5 bg-white shadow-common rounded-lg p-4">
      {/* Header */}
      <section>
        <p className="text-lg font-bold border-b-[1px] pb-2 border-gray-200">
          {name}
        </p>
      </section>
      {/* Body */}
      <section className="flex flex-col gap-4">
        {infoArr.map((info, index) => (
          <ViewInfo
            label={info.label}
            key={index}
            labelClassName="font-normal"
            className="flex justify-between items-center">
            {info.value}
          </ViewInfo>
        ))}
      </section>
    </div>
  );
};
