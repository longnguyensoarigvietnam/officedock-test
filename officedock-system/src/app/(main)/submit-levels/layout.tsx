import { SubmitLevelStateProvider } from '@providers/SubmitLevelProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SubmitLevelStateProvider>{children}</SubmitLevelStateProvider>
    </div>
  );
}
