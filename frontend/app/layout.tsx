import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ff-bg text-ff-text min-h-screen">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
