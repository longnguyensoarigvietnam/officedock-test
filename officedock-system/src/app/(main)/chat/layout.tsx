import { ChatProvider } from '@providers/ChatProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ChatProvider>{children}</ChatProvider>
    </div>
  );
}
