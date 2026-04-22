'use client';

type HeaderProps = {
  pageName?: string;
  className?: string;
};

const Header = ({ className, pageName }: HeaderProps) => {
  return (
    <header
      className={`bg-white shadow-common w-full h-[70px] p-4 rounded-lg flex justify-between item-center ${className}`}>
      <h1 className="font-bold text-gray-900 text-2xl leading-7 flex items-center">
        {pageName}
      </h1>
      <div className="flex gap-4 items-center"></div>
    </header>
  );
};

export default Header;
