import { Worker } from "node:worker_threads";
/**
 * Render the jobs on several threads, each with its own engine. A free thread takes the next job, so sounds
 * of unequal length keep every thread busy. The results come back in the order of the jobs; `onResult` is
 * called as each one arrives. A failing job is reported and does not stop the others, unless `failFast`:
 * then no job is handed out after the first failure.
 */
export async function runJobsInWorkers(jobs, options) {
    const results = new Array(jobs.length).fill(undefined);
    let next = 0;
    let stopped = false;
    const count = Math.max(1, Math.min(options.workers, jobs.length));
    await Promise.all(Array.from({ length: count }, () => new Promise(resolve => {
        const worker = new Worker(new URL("./worker.js", import.meta.url));
        let current = -1;
        const finish = (index, result) => {
            results[index] = result;
            options.onResult?.(result);
            if (!result.ok && options.failFast)
                stopped = true;
        };
        const give = () => {
            if (stopped || next >= jobs.length) {
                void worker.terminate().then(() => resolve());
                return;
            }
            current = next++;
            worker.postMessage({ index: current, job: jobs[current] });
        };
        worker.on("message", ({ index, result }) => {
            finish(index, result);
            give();
        });
        worker.on("error", (cause) => {
            if (current >= 0 && results[current] === undefined) {
                finish(current, { job: jobs[current], ok: false, warnings: [], message: `${jobs[current].src}: ${cause.message}` });
            }
            give();
        });
        give();
    })));
    return results.filter((result) => result !== undefined);
}
