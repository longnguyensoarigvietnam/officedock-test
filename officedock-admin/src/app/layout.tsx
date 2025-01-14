import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@providers/AuthProvider';
import QueryProvider from '@providers/QueryProvider';
import { LoadingProvider } from '@providers/LoadingProvider';
import { ToastProvider } from '@providers/ToastProvider';

import { fontPrimary } from '@utils/fonts';

export const metadata: Metadata = {
  title: process.env.APP_NAME,
  icons: [
    {
      url: '/images/logo.svg',
      href: '/images/logo.svg',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* TODO: Config font and using in here */}
      <body
        className={`${fontPrimary.className} bg-white overflow-y-hidden overflow-x-auto`}>
        <AuthProvider>
          <QueryProvider>
            <LoadingProvider>
              <ToastProvider>{children}</ToastProvider>
            </LoadingProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
