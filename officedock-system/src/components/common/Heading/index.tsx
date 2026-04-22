import { ReactNode } from 'react';

export type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingProps = {
  sz?: HeadingSize;
  as?: HeadingTag;
  className?: string;
  children: ReactNode;
};

const Heading = ({
  sz = 'md',
  as = 'h2',
  className = '',
  children,
}: HeadingProps) => {
  let sizeClass = '';
  switch (sz) {
    case 'xs':
      sizeClass = 'text-xs';
      break;
    case 'sm':
      sizeClass = 'text-sm';
      break;
    case 'lg':
      sizeClass = 'text-lg';
      break;
    case 'xl':
      sizeClass = 'text-xl';
      break;
    case '2xl':
      sizeClass = 'text-2xl';
      break;
    default:
      sizeClass = 'text-md';
      break;
  }
  const Tag = as;

  return (
    <Tag
      className={`font-bold ${sizeClass} leading-7 text-gray-900 ${className}`}>
      {children}
    </Tag>
  );
};

export default Heading;
