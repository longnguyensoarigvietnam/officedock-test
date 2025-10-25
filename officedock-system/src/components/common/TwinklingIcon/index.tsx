import { motion } from 'framer-motion';

export const TwinklingIcon = ({
  className,
  delay,
  iconUrl,
}: {
  className: string;
  delay: number;
  iconUrl: string;
}) => {
  const icon = `url(${iconUrl})`;
  return (
    <motion.div
      className={`w-3 h-3 bg-contain bg-no-repeat ${className}`}
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
