import { OrganizationSkillStateProvider } from '@providers/OrganizationSkillProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <OrganizationSkillStateProvider>
        {children}
      </OrganizationSkillStateProvider>
    </div>
  );
}
