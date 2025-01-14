import { TagStateProvider } from '@providers/TagProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <TagStateProvider>{children}</TagStateProvider>
    </div>
  );
}
