import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/PageSkeleton";

export const CycleChart = dynamic(
  () => import("./CycleChart").then((mod) => ({ default: mod.CycleChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const ReturnDistribution = dynamic(
  () =>
    import("./ReturnDistribution").then((mod) => ({
      default: mod.ReturnDistribution,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const YieldCurveChart = dynamic(
  () =>
    import("./YieldCurveChart").then((mod) => ({ default: mod.YieldCurveChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);
