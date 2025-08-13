import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'option';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  sz?: ButtonSize;
};

const Button = ({
  variant = 'primary',
  sz = 'md',
  className,
  children,
  ...props
}: ButtonProps) => {
  let variantClassNames = '';
  let sizeClassNames = '';
  let backgroundStyle = '';

  switch (variant) {
    case 'primary':
      variantClassNames = 'border text-white hover:bg-opacity-90';
      backgroundStyle =
        'linear-gradient(113.86deg, #289BF2 15.33%, #73CCDF 84.67%)';
      break;
    case 'secondary':
      variantClassNames =
        'border text-black border-gray-200 bg-gray-200 hover:bg-gray-100';
      break;
    case 'outline':
      variantClassNames =
        'border text-primary border-primary bg-white hover:bg-gray-50';
      break;
    case 'option':
      variantClassNames = 'border bg-[#3CABF3] text-white hover:bg-opacity-90';

      break;

    case 'text':
      variantClassNames = 'text-primary hover:text-opacity-70';
      break;
  }

  switch (sz) {
    case 'xs':
      sizeClassNames = 'text-sm px-8 py-1';
      break;
    case 'sm':
      sizeClassNames = 'text-sm px-4 py-2.5';
      break;
    case 'md':
      sizeClassNames = 'text-sm px-4 py-2.5';
      break;
    case 'lg':
      sizeClassNames = 'text-base p-4';
      break;
  }

  return (
    <button
      style={{
        background: backgroundStyle,
      }}
      className={`inline-flex rounded-lg justify-center font-medium items-center disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer transition-all duration-300 ${variantClassNames} ${sizeClassNames} ${className}`}
      {...props}>
      {children}
    </button>
  );
};

export default Button;
