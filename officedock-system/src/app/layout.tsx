import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';

const DraggableLayout = dynamic(
  () => import('@components/layouts/Draggable') as any,
  { ssr: false },
) as any;

import { AuthProvider } from '@providers/AuthProvider';
import QueryProvider from '@providers/QueryProvider';
import { LoadingProvider } from '@providers/LoadingProvider';
import { ToastProvider } from '@providers/ToastProvider';
import { TaskProvider } from '@providers/TaskProvider';
import { GlobalStateProvider } from '@providers/GlobalStateProvider';
import { WebSocketProvider } from '@providers/WebSocketProvider';

import { fontPrimary } from '@utils/fonts';

export const metadata: Metadata = {
  title: '',
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
        className={`${fontPrimary.variable} font-primary bg-[#F6F9FA] overflow-y-hidden overflow-x-auto scrollbar-gutter-stable`}>
        <GlobalStateProvider>
          <AuthProvider>
            <QueryProvider>
              <WebSocketProvider>
                <LoadingProvider>
                  <ToastProvider>
                    <TaskProvider>
                      <DraggableLayout />
                      {children}
                    </TaskProvider>
                  </ToastProvider>
                </LoadingProvider>
              </WebSocketProvider>
            </QueryProvider>
          </AuthProvider>
        </GlobalStateProvider>
      </body>
    </html>
  );
}
