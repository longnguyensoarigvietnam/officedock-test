import { TaskTeamStateProvider } from '@providers/TaskTeamProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <TaskTeamStateProvider>{children}</TaskTeamStateProvider>
    </div>
  );
}
