// Background worker: delivers queued emails. Run with `npm run worker` alongside the API
// (needs REDIS_URL and QUEUE_EMAILS=true). Start more copies to process more in parallel.
import "dotenv/config";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import { connectdb } from "./db/connection.db.js";
import { createRedisConnection, isRedisEnabled } from "./db/redis.db.js";
import { EMAIL_QUEUE } from "./queues/email.queue.js";
import { processEmailJob, handleFailedEmailJob } from "./services/notification.service.js";

if (!isRedisEnabled()) {
    console.error("REDIS_URL is not set - the worker has nothing to process");
    process.exit(1);
}

await connectdb();

const worker = new Worker(EMAIL_QUEUE, processEmailJob, {
    // BullMQ workers need blocking connections that retry forever
    connection: createRedisConnection({ maxRetriesPerRequest: null }),
    concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY) || 5,
    // Stay under typical SMTP provider limits (e.g. Gmail) across all worker copies
    limiter: { max: 10, duration: 1000 },
});

worker.on("ready", () => console.log(`Email worker listening on queue "${EMAIL_QUEUE}"`));
worker.on("failed", (job, error) => {
    handleFailedEmailJob(job, error).catch((e) => console.error("Could not record email failure:", e.message));
});
worker.on("error", (error) => console.error("Worker error:", error.message));

const shutdown = async (signal) => {
    console.log(`${signal} received - finishing in-flight emails`);
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
