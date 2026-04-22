export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#EBF1F7]">{children}</div>;
}
