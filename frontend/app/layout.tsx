"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DataStatusBar } from "@/components/layout/DataStatusBar";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
          },
        },
      })
  );

  return (
    <html lang="en">
      <body className="bg-ff-bg text-ff-text min-h-screen">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header />
              <DataStatusBar />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="print:hidden">
              <ReactQueryDevtools initialIsOpen={false} />
            </div>
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}
