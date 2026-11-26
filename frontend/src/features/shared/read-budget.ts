import { ApiError } from "../../api/errors.ts";
/** Reserve capacity for authentication/mutations and other local clients. No retries here. */
export function createReadBudget(
  limit = 60,
  windowMs = 61000,
  concurrency = 2,
) {
  const history: number[] = [];
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  type Job = { signal?: AbortSignal; start: () => void; cancel: () => void };
  const queue: Job[] = [];
  function drain() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    const now = Date.now();
    while (history.length && history[0] <= now - windowMs) history.shift();
    while (queue.length && active < concurrency && history.length < limit) {
      const job = queue.shift()!;
      if (job.signal?.aborted) {
        job.cancel();
        continue;
      }
      history.push(Date.now());
      active++;
      job.start();
    }
    if (queue.length && active < concurrency && history.length >= limit)
      timer = setTimeout(
        drain,
        Math.max(1, history[0] + windowMs - Date.now()),
      );
  }
  return {
    run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
      return new Promise((resolve, reject) => {
        let started = false;
        const cancelled = () =>
          reject(new ApiError("cancelled", "Request cancelled."));
        const abort = () => {
          if (!started) {
            const i = queue.indexOf(job);
            if (i >= 0) queue.splice(i, 1);
            cancelled();
            drain();
          }
        };
        const job: Job = {
          signal,
          cancel: cancelled,
          start: () => {
            started = true;
            signal?.removeEventListener("abort", abort);
            Promise.resolve()
              .then(() => {
                if (signal?.aborted)
                  throw new ApiError("cancelled", "Request cancelled.");
                return task();
              })
              .then(resolve, reject)
              .finally(() => {
                active--;
                drain();
              });
          },
        };
        if (signal?.aborted) {
          cancelled();
          return;
        }
        signal?.addEventListener("abort", abort, { once: true });
        queue.push(job);
        drain();
      });
    },
  };
}
