import { SkillStateProvider } from '@providers/SkillProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SkillStateProvider>{children}</SkillStateProvider>
    </div>
  );
}
