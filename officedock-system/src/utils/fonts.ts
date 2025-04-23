import localFont from 'next/font/local';

const fontPrimary = localFont({
  src: [
    {
      path: '../../public/fonts/primary/NotoSansCJKjp-Bold.ttf',
      weight: '700',
    },
    {
      path: '../../public/fonts/primary/NotoSansCJKjp-Medium.ttf',
      weight: '500',
    },
    {
      path: '../../public/fonts/primary/NotoSansCJKjp-Regular.ttf',
      weight: '400',
    },
  ],
  variable: '--font-primary',
});

export { fontPrimary };
