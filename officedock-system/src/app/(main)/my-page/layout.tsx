import { MyPageStateProvider } from '@providers/MyPageProvider';

export default async function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <MyPageStateProvider>{children}</MyPageStateProvider>
    </div>
  );
}
