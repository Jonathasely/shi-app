import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHI Aroma Lab",
  description: "Descubra qual fragrância combina com você",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAF8] text-[#1A1A1A] font-sans">
        {children}
      </body>
    </html>
  );
}
