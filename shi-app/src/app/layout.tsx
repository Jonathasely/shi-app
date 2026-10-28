import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHI Aroma Lab",
  description: "Descubra sua assinatura olfativa — Singular · Hedônico · Inesquecível",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
