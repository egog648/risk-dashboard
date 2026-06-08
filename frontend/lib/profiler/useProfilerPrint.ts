"use client";

import { useCallback } from "react";

export function useProfilerPrint() {
  const print = useCallback(() => {
    document.body.classList.add("profiler-print-active");
    window.print();
    const cleanup = () => {
      document.body.classList.remove("profiler-print-active");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  }, []);

  return print;
}
