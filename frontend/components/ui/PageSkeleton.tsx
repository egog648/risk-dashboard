export function PageSkeleton({ titleWidth = "w-64" }: { titleWidth?: string }) {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className={`h-8 ${titleWidth} bg-ff-border rounded`} />
        <div className="h-4 w-96 bg-ff-border rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-ff-border rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = "h-56" }: { height?: string }) {
  return (
    <div className={`w-full ${height} bg-ff-border rounded-lg animate-pulse`} />
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 bg-ff-border rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-ff-border rounded" />
      ))}
    </div>
  );
}
