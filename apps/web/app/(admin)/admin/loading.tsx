import { Card, CardBody } from '@/components/ui/card';
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton';

/** Keeps the admin shell stable while the dashboard's parallel reads resolve. */
export default function AdminDashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-4 h-32 w-full" />

      <div className="mt-6 flex h-9 w-full max-w-md gap-1 rounded-lg bg-muted p-[3px]">
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} className="px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody className="p-0">
          <SkeletonRows rows={6} />
        </CardBody>
      </Card>
    </div>
  );
}
