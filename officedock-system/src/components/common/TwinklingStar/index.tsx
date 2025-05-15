import { motion } from 'framer-motion';

export const TwinklingStar = ({ className, delay }: { className: string; delay: number }) => (
    <motion.div
      className={`w-3 h-3 bg-[url(/icons/blue-star.svg)] bg-contain bg-no-repeat ${className}`}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );