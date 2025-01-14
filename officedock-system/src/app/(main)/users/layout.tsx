import { UserStateProvider } from '@providers/UserProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <UserStateProvider>{children}</UserStateProvider>
    </div>
  );
}
