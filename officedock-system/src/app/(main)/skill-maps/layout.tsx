import { SkillMapStateProvider } from '@providers/SkillMapProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SkillMapStateProvider>{children}</SkillMapStateProvider>
    </div>
  );
}
