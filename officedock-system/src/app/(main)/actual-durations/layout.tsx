import { ActualDurationStateProvider } from '@providers/ActualDurationProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ActualDurationStateProvider>{children}</ActualDurationStateProvider>
    </div>
  );
}
