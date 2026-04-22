import { OrganizationStateProvider } from '@providers/OrganizationProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <OrganizationStateProvider>{children}</OrganizationStateProvider>
    </div>
  );
}
