import { CategoryStateProvider } from '@providers/CategoryProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <CategoryStateProvider>{children}</CategoryStateProvider>
    </div>
  );
}
