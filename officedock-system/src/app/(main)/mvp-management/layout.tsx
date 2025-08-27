import { MVPManagementStateProvider } from '@providers/MVPManagementProvider';

export default async function MVPManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <MVPManagementStateProvider>{children}</MVPManagementStateProvider>
    </div>
  );
}
