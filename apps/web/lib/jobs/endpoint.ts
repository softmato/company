/**
 * The shape every job route has, so each one is left with the two lines that
 * are actually about it.
 *
 * The sibling of `lib/api/route.ts` for `/api/v1`, and it does the same three
 * things: authenticate, run, serialise. Jobs additionally report how long they
 * took and never leak a stack trace — a cron runner's logs are not a private
 * place, and `poll-pending-transactions` failing carries provider detail.
 *
 * **A job that throws returns 500 with a generic body, and the real error goes
 * to the log.** That matters for the dead-man's switch: a monitor watching for
 * non-200 is how a silently broken job gets noticed (docs/ENVIRONMENT.md §6),
 * so failure must be visible in the status code even when it is not in the
 * body.
 */
import 'server-only';
import { NextResponse } from 'next/server';

import { isAuthorisedJobRequest, NOT_FOUND } from './guard';

export type JobHandler = () => Promise<Record<string, unknown>>;

export function jobEndpoint(
  name: string,
  handler: JobHandler,
): (request: Request) => Promise<NextResponse> {
  return async (request) => {
    if (!isAuthorisedJobRequest(request)) return NOT_FOUND;

    const startedAt = Date.now();

    try {
      const result = await handler();

      return NextResponse.json({
        job: name,
        ok: true,
        ms: Date.now() - startedAt,
        ...result,
      });
    } catch (error) {
      console.error(`[job:${name}]`, error);

      return NextResponse.json(
        { job: name, ok: false, ms: Date.now() - startedAt },
        { status: 500 },
      );
    }
  };
}
