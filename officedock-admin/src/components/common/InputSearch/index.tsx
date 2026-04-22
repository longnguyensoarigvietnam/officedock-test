import Input, { InputProps } from '../Input';
import ImageRound from '../ImageRound';

type InputSearchProps = {
  className?: string;
  inputClassName?: string;
} & InputProps;

const InputSearch = ({
  className,
  inputClassName,
  ...props
}: InputSearchProps) => {
  return (
    <div className={`relative ${className}`}>
      <ImageRound
        src="/icons/search.svg"
        name="Search input icon"
        className="absolute w-4 h-4 z-10 ml-3 top-3.5"
      />
      <Input
        className={`border-t-0 border-x-0 pl-9 focus:!shadow-none ${inputClassName}`}
        {...props}
      />
    </div>
  );
};

export default InputSearch;
