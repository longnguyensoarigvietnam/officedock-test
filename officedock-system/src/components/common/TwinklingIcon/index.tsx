import { motion } from 'framer-motion';

export const TwinklingIcon = ({
  className,
  delay,
  iconUrl,
  isZoom,
}: {
  className: string;
  delay: number;
  iconUrl: string;
  isZoom?: boolean;
}) => {
  const icon = `url(${iconUrl})`;
  return (
    <motion.div
      className={`${isZoom ? 'w-[0.83vw] h-[0.83vw]' : 'w-3 h-3'} bg-contain bg-no-repeat ${className}`}
      style={{ backgroundImage: icon }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
};
