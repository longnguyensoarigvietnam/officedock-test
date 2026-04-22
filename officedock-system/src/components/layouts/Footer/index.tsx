import ImageRound from '@components/common/ImageRound';

type Props = {
  className?: string;
};

const Footer = ({ className }: Props) => {
  return (
    <footer
      className={`flex flex-col items-center gap-4 w-full text-center text-xs font-normal leading-5 mb-10 ${className}`}>
      <ImageRound
        className="w-10 h-10"
        src="/images/logo.svg"
        border="full"
        name="Logo footer"
      />
      <div className="flex flex-col">
        <span>利用規約｜個人情報保護方針｜お問い合わせ</span>
        <span>©Office Dock</span>
      </div>
    </footer>
  );
};

export default Footer;
