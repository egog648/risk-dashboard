import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="pb-24 animate-pulse">
      <div className="bg-ff-navy h-32 -mx-6 -mt-6 mb-4" />
      <PageSkeleton titleWidth="w-80" />
    </div>
  );
}
