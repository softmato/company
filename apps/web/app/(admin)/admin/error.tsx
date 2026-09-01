'use client';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

/** Dashboard-specific failure state; global marketing error styling is not a tool UI. */
export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Dashboard data is unavailable</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The dashboard could not load its operational data. Try again; if the
          issue persists, use the reference below when checking the logs.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Reference:{' '}
            <span className="numeric select-all">{error.digest}</span>
          </p>
        ) : null}
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </CardBody>
    </Card>
  );
}
