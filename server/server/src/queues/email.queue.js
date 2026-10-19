import { Queue } from "bullmq";
import { createRedisConnection, isRedisEnabled } from "../db/redis.db.js";

// Emails are handed to a background worker (src/worker.js) through a BullMQ queue on
// Redis, so API requests don't wait on SMTP and failed sends are retried with backoff.
// Opt-in with QUEUE_EMAILS=true: it needs a long-running worker process, which
// serverless hosts such as Vercel can't run. Otherwise emails are sent inline.
const EMAIL_QUEUE = "emails";

const isEmailQueueEnabled = () => process.env.QUEUE_EMAILS === "true" && isRedisEnabled();

let queue = null;

const getQueue = () => {
    if (!queue) {
        queue = new Queue(EMAIL_QUEUE, {
            connection: createRedisConnection(),
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: "exponential", delay: 10_000 }, // 10s, 20s, 40s, 80s
                removeOnComplete: { count: 1000 },
                removeOnFail: { count: 5000 },
            },
        });
    }
    return queue;
};

// data: { mail: { to, subject, text, html }, interview?: { applicationId, scheduledAt } }
const enqueueEmail = (data) => getQueue().add("send", data);

const closeEmailQueue = async () => {
    if (queue) {
        await queue.close().catch(() => {});
        queue = null;
    }
};

export { EMAIL_QUEUE, isEmailQueueEnabled, enqueueEmail, closeEmailQueue };
