import type { Metadata } from "next";
import ThemeRegistry from "./ui/design/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imsure",
  description: "Funil de vendas para corretoras de seguros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
