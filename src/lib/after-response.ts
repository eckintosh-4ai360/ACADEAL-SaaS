import { after } from "next/server";

/**
 * Run background work that must not block the HTTP response — credential SMS,
 * announcement broadcasts, post-write fan-out.
 *
 * The naive way to do this is `void (async () => { ... })()` right before the
 * `return`. That works on a long-lived Node server and silently breaks on
 * serverless: the moment the response is flushed the execution environment is
 * frozen, so the pending promise stops mid-flight. It only resumes if that same
 * instance is later reused for another request — which is why a "fire-and-forget"
 * SMS can arrive hours after the record was created, or never at all.
 *
 * `after()` is the supported way to say "keep this invocation alive until the
 * callback finishes". Request-scoped APIs (headers, cookies, and therefore
 * tenant resolution) are still readable inside the callback.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>) {
  const run = async () => {
    try {
      await task();
    } catch (error) {
      console.error(`[${label}] background task failed:`, error);
    }
  };

  try {
    after(run);
  } catch {
    //* Outside a request scope (seed scripts, tests). Nothing is going to be
    //* frozen there, so running it detached is safe.
    void run();
  }
}
