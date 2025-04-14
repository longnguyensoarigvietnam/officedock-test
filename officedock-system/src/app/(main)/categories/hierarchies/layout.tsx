import { HierarchyStateProvider } from '@providers/HierarchyProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <HierarchyStateProvider>{children}</HierarchyStateProvider>
    </div>
  );
}
