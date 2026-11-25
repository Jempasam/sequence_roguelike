import type { Job, JobResult, RunOptions } from "./batch.js";
export interface ParallelOptions extends RunOptions {
    /** How many threads render at the same time; never more than there are jobs. */
    workers: number;
}
/**
 * Render the jobs on several threads, each with its own engine. A free thread takes the next job, so sounds
 * of unequal length keep every thread busy. The results come back in the order of the jobs; `onResult` is
 * called as each one arrives. A failing job is reported and does not stop the others, unless `failFast`:
 * then no job is handed out after the first failure.
 */
export declare function runJobsInWorkers(jobs: Job[], options: ParallelOptions): Promise<JobResult[]>;
