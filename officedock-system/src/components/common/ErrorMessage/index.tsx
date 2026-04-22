import { ReactNode } from 'react';

type Props = {
  className?: string;
  error?: ReactNode;
};

const ErrorMessage = ({ className, error }: Props) => {
  return (
    <div className={`text-sm text-error font-normal leading-4 ${className}`}>
      {error}
    </div>
  );
};

export default ErrorMessage;
