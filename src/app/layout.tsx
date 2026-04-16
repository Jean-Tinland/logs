import type { Metadata } from "next";
import AppContextProvider from "@/components/app-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Logs",
    template: "%s · Logs",
  },
  description: "Standalone logs app extracted from Draft Pad.",
  applicationName: "Logs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppContextProvider>{children}</AppContextProvider>
      </body>
    </html>
  );
}
