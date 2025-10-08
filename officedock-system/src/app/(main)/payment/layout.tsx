import StripeProvider from '@providers/StripeProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StripeProvider>{children}</StripeProvider>;
}
