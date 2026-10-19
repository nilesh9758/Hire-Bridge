import Application from "../models/application.model.js";
import { sendMail, deliverMail } from "../utils/mailer.js";
import { isEmailQueueEnabled, enqueueEmail } from "../queues/email.queue.js";
import { getRedis } from "../db/redis.db.js";

// Saves the outcome of an interview email on the application. Matching on scheduledAt
// keeps a late result for an old invite from overwriting the status of a reschedule.
const recordInterviewEmail = async ({ applicationId, scheduledAt }, result) => {
    const $set = { "interview.emailSent": Boolean(result.sent) };
    const $unset = {};
    if (result.previewUrl) $set["interview.emailPreviewUrl"] = result.previewUrl;
    else $unset["interview.emailPreviewUrl"] = 1;
    if (result.error) $set["interview.emailError"] = result.error;
    else $unset["interview.emailError"] = 1;

    await Application.updateOne(
        { _id: applicationId, "interview.scheduledAt": new Date(scheduledAt) },
        { $set, $unset }
    );
};

/**
 * Sends an email, through the background queue when it is enabled.
 * Pass `interview` to have the delivery outcome recorded on the application.
 * Returns { queued: true }, or the inline send result { queued: false, sent, previewUrl, error }.
 */
const notify = async (mail, { interview } = {}) => {
    // While Redis is unreachable, send right away rather than waiting on the queue
    if (isEmailQueueEnabled() && getRedis()) {
        try {
            await enqueueEmail({ mail, interview });
            return { queued: true };
        } catch (error) {
            console.error("Could not queue email, sending it now instead:", error.message);
        }
    }

    const result = await sendMail(mail);
    if (interview) await recordInterviewEmail(interview, result);
    return { ...result, queued: false };
};

// Worker side: throwing makes BullMQ retry the job with backoff
const processEmailJob = async (job) => {
    const result = await deliverMail(job.data.mail);
    if (job.data.interview) await recordInterviewEmail(job.data.interview, result);
    return result;
};

// Called after a failed attempt; records the failure once retries are exhausted
const handleFailedEmailJob = async (job, error) => {
    if (!job) return;
    const attempts = job.opts.attempts || 1;
    console.error(`Email to ${job.data.mail?.to} failed (attempt ${job.attemptsMade}/${attempts}):`, error.message);
    if (job.attemptsMade >= attempts && job.data.interview) {
        await recordInterviewEmail(job.data.interview, { sent: false, error: error.message });
    }
};

export { notify, recordInterviewEmail, processEmailJob, handleFailedEmailJob };
