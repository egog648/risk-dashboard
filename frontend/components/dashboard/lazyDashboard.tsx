import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/PageSkeleton";

export const EfficientFrontierChart = dynamic(
  () =>
    import("./EfficientFrontierChart").then((mod) => ({
      default: mod.EfficientFrontierChart,
    })),
  { loading: () => <ChartSkeleton height="h-72" />, ssr: false }
);

export const RiskSpeedometer = dynamic(
  () =>
    import("./RiskSpeedometer").then((mod) => ({ default: mod.RiskSpeedometer })),
  { loading: () => <ChartSkeleton height="h-40" />, ssr: false }
);
