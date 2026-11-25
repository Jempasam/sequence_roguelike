import { parentPort } from "node:worker_threads";
import { runJob } from "./batch.js";
import { nodeEngine } from "./node.js";
/**
 * A worker thread of `runJobsInWorkers` (`parallel.ts`): renders the jobs it is given, one at a time, with
 * an engine of its own (the Faust module is not shared between threads).
 */
parentPort.on("message", async ({ index, job }) => {
    const result = await runJob(await nodeEngine(), job);
    parentPort.postMessage({ index, result });
});
