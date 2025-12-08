'use client';
import './styles/style.css';

export type RadioButtonProps = {
  id?: string;
  name?: string;
  className?: string;
  isChecked?: boolean;
  classSize?: string;
  disable?: boolean;
  description?: string;
  label?: string;
  classLabel?: string;
  onChange?: any
};

const RadioButton = ({
  id,
  name,
  className,
  classSize,
  isChecked = false,
  disable = false,
  description,
  label,
  classLabel,
  onChange,
  ...props
}: RadioButtonProps) => {
  return (
    <div
      className={`relative flex gap-2 items-start ${className}`}>
      <div className="flex h-6 items-center">
        <input
          id={id}
          aria-describedby={`${id}-description`}
          name={name}
          type="radio"
          className={`h-4 w-4 border-[#77858F] focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 focus:ring-offset-0 hover:cursor-pointer ${classSize}`}
          checked={isChecked}
          disabled={disable}
          onChange={onChange}
          {...props}
        />
      </div>
      <div
        className={`text-sm leading-6 flex`}>
        <label
          htmlFor={id}
          className={`font-medium text-gray-900 hover:cursor-pointer ${classLabel}`}
          onClick={onChange}>
          {label}
        </label>
        <p
          id={`${id}-description`}
          className={`text-gray-500`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default RadioButton;
