import localFont from 'next/font/local';

const fontPrimary = localFont({
  src: [
    {
      path: '../../public/fonts/primary/NotoSansJP-Bold.ttf',
      weight: '700',
    },
    {
      path: '../../public/fonts/primary/NotoSansJP-SemiBold.ttf',
      weight: '600',
    },
    {
      path: '../../public/fonts/primary/NotoSansJP-Medium.ttf',
      weight: '500',
    },
    {
      path: '../../public/fonts/primary/NotoSansJP-Regular.ttf',
      weight: '400',
    },
  ],
  variable: '--font-primary',
});

export { fontPrimary };
