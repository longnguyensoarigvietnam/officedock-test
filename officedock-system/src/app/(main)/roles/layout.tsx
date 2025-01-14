import { RoleStateProvider } from '@providers/RoleProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <RoleStateProvider>{children}</RoleStateProvider>
    </div>
  );
}
