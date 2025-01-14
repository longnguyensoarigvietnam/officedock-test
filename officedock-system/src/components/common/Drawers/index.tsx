import Heading from '../Heading';
import ImageRound from '../ImageRound';

export type DrawersProps = {
  open: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  onClose: () => void;
};
const Drawer = ({
  open,
  title,
  className,
  children,
  onClose,
}: DrawersProps) => {
  return (
    <div>
      <div
        className={`fixed inset-0 z-[21] bg-black bg-opacity-50 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed ${className} top-[76px] z-[21] h-[calc(100vh-76px)] overflow-hidden right-0  w-fit bg-white shadow-lg  transform transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}>
        <div className={`px-4 font-primary ${className}`}>
          {title && (
            <header className="flex  border-b pb-4  border-solid border-gray-100 justify-between items-center mb-4">
              <Heading className="leading-10 !text-[#374151] text-lg" as="h1">
                {title}
              </Heading>
              <ImageRound
                className="mt-1 w-5 h-5 hover:cursor-pointer"
                src="/icons/close.svg"
                name="Close modal"
                onClick={onClose}
              />
            </header>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
