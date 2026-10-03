// NCH 3.0 — API route helpers

import { NextResponse } from 'next/server';
import { HttpError } from './auth';

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.message, err.status);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  console.error('[API]', err);
  return fail(message, 500);
}

export function jsonErrorBoundary<T>(fn: () => Promise<NextResponse>) {
  return fn().catch(handleError);
}
