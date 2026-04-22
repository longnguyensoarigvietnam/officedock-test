import Input, { InputProps } from '../Input';
import ImageRound from '../ImageRound';

type InputSearchProps = {
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  customSearchIconUrl?: string;
} & InputProps;

const InputSearch = ({
  className,
  inputClassName,
  iconClassName,
  customSearchIconUrl,
  ...props
}: InputSearchProps) => {
  return (
    <div className={`relative ${className}`}>
      <ImageRound
        src={customSearchIconUrl ? customSearchIconUrl : `/icons/search.svg`}
        name="Search input icon"
        className={`absolute w-4 h-4 z-10 ml-3 top-1/2 -translate-y-1/2 ${iconClassName}`}
      />
      <Input
        className={`pl-9 focus:!shadow-none ${inputClassName}`}
        {...props}
      />
    </div>
  );
};

export default InputSearch;
