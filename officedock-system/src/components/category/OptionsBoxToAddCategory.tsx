import ImageRound from '@components/common/ImageRound';
import { Popover, PopoverButton } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const OptionsBoxToAddCategory = ({
  text,
  addCategoryUsingInput,
  addCategoryUsingDropdown,
}: {
  text: string;
  addCategoryUsingInput: (option: string) => void;
  addCategoryUsingDropdown: (option: string) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleToggle = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    setIsOpen((prev) => !prev);
    setIsReady(false);

    requestAnimationFrame(() => {
      if (dropdownRef.current) {
        const dropdownHeight = dropdownRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        const shouldShowAbove =
          buttonRect.bottom + dropdownHeight + 10 > viewportHeight;

        setPosition({
          top: shouldShowAbove
            ? buttonRect.top - dropdownHeight - 10 + window.scrollY
            : buttonRect.bottom + 10 + window.scrollY,
          left: buttonRect.left + window.scrollX,
        });

        setIsReady(true);
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const renderOptions = () => {
    const buttonWidth = buttonRef.current?.offsetWidth || 252;

    return (
      <div
        ref={dropdownRef}
        className="fixed bg-[#5B6770] text-white rounded-[6px] py-[5px] text-sm font-medium shadow-lg z-50 transition-opacity duration-200"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          opacity: isReady ? 1 : 0,
          visibility: isReady ? 'visible' : 'hidden',
          width: `${buttonWidth}px`,
        }}>
        <button
          className="py-[10px] px-[14px] text-left w-full hover:bg-[#7D8A94] transition-all duration-200 rounded-[6px]"
          onClick={() => {
            setIsOpen(false);
            addCategoryUsingInput('input');
          }}>
          チームの業務カテゴリーを入力
        </button>
        <button
          className="py-[10px] px-[14px] text-left w-full hover:bg-[#7D8A94] transition-all duration-200 rounded-[6px]"
          onClick={() => {
            setIsOpen(false);
            addCategoryUsingDropdown('pulldown');
          }}>
          登録済みの業務カテゴリーから選択
        </button>
      </div>
    );
  };

  return (
    <>
      <Popover className="relative">
        <PopoverButton
          ref={buttonRef}
          className="focus:outline-none flex items-center gap-2 h-[34px] bg-[#ECF0F2] w-full rounded-[6px] py-[4px] px-[10px]"
          onClick={handleToggle}>
          <ImageRound
            className="w-[17px] h-[17px] hover:cursor-pointer"
            src="/icons/add-category.svg"
            name="Add category icon"
          />
          <p className="text-[#77858F] font-medium text-sm">{text}</p>
        </PopoverButton>
      </Popover>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />,
          document.body,
        )}
      {isOpen && createPortal(renderOptions(), document.body)}
    </>
  );
};
