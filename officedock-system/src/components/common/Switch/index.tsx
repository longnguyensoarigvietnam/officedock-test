'use client';

import { useEffect, useState } from 'react';
import { Label, SwitchGroup, Switch as SwitchUI } from '@headlessui/react';

export type SwitchProps = {
  id?: string;
  label?: string;
  disabled?: boolean;
  description?: string;
  enable?: boolean;
  readOnly?: boolean;
  className?: string;
  enableColor?: string;
  disableColor?: string;
  customTranslate?: string;
  onChange?: (status: boolean) => void;
};
const Switch = ({
  id,
  label,
  disabled = false,
  description,
  enable = false,
  className,
  enableColor = 'rgb(59 130 246)',
  disableColor = 'rgb(229 231 235)',
  customTranslate,
  onChange,
}: SwitchProps) => {
  const [enabled, setEnabled] = useState(enable);

  const handleChange = (value: boolean) => {
    setEnabled(value);
    onChange && onChange(value);
  };
  useEffect(() => {
    if (enable !== enabled) {
      setEnabled(enable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enable]);

  return (
    <SwitchGroup>
      <div className={`flex gap-2 items-center ${className}`}>
        <SwitchUI
          id={id}
          name={id}
          disabled={disabled}
          checked={enabled}
          onChange={(value) => handleChange(value)}
          style={{ backgroundColor: enabled ? enableColor : disableColor }}
          className={`
          switch-button relative inline-flex shrink-0 h-[26px] w-[50px] cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}>
          <span
            aria-hidden="true"
            className={`${enabled ? `translate-x-full ${customTranslate} ml-1` : 'translate-x-0 ml-1'}
            pointer-events-none inline-block h-[18px] mt-[2px] w-[18px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
          />
        </SwitchUI>
        <div className={`switch-label flex gap-1 hover:cursor-pointer`}>
          <Label htmlFor={id} className="font-medium">
            {label}
          </Label>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>
    </SwitchGroup>
  );
};

export default Switch;
