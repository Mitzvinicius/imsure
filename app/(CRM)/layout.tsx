import SideNav from "@/app/components/sidenav/sidenav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <SideNav conteudo={children} />
)}