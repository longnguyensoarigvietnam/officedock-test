import Image from 'next/image';

import Button, { ButtonProps } from '../Button';

type Provider = 'google' | 'facebook';
type ButtonSSOProps = {
  className?: string;
  provider?: Provider;
  text: string;
  iconUrl?: string;
} & ButtonProps;

const ButtonSSO = ({
  provider,
  className,
  text,
  iconUrl,
  ...props
}: ButtonSSOProps) => {
  let providerIcon;

  switch (provider) {
    case 'google':
      providerIcon = '/icons/google.svg';
      break;
    case 'facebook':
      providerIcon = '/icons/facebook.svg';
      break;
    default:
      providerIcon = iconUrl;
      break;
  }

  return (
    <Button
      variant="outline"
      className={`!border-gray-200 !text-gray-500 gap-1 !py-2 ${className}`}
      {...props}>
      {providerIcon && (
        <Image
          src={providerIcon}
          alt="SSO Provider Icon"
          width={20}
          height={20}
          className="cursor-pointer"
        />
      )}
      {text}
    </Button>
  );
};

export default ButtonSSO;
