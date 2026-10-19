import nodemailer from "nodemailer";

// Uses real SMTP when SMTP_HOST is configured in .env. Otherwise falls back to an
// Ethereal test inbox (https://ethereal.email): nothing is delivered, but every
// message gets a preview URL so the flow can be exercised locally.
let transporterPromise = null;

const createTransporter = async () => {
    if (process.env.SMTP_HOST) {
        return {
            transporter: nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: process.env.SMTP_USER
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    : undefined,
            }),
            isTest: false,
        };
    }

    const account = await nodemailer.createTestAccount();
    console.log("SMTP not configured - using Ethereal test inbox:", account.user);
    return {
        transporter: nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
        }),
        isTest: true,
    };
};

const getTransporter = () => {
    if (!transporterPromise) {
        transporterPromise = createTransporter().catch((error) => {
            transporterPromise = null; // allow a retry on the next send
            throw error;
        });
    }
    return transporterPromise;
};

// Sends an email and throws on failure (used by the queue worker so failed sends are retried).
// Returns { sent: true, previewUrl }.
const deliverMail = async ({ to, subject, text, html }) => {
    const { transporter, isTest } = await getTransporter();
    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || '"HireBridge" <no-reply@hirebridge.local>',
        to,
        subject,
        text,
        html,
    });
    const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) || undefined : undefined;
    if (previewUrl) console.log(`Email to ${to} - preview: ${previewUrl}`);
    return { sent: true, previewUrl };
};

/**
 * Sends an email. Never throws: returns { sent, previewUrl, error } so callers can
 * record the outcome without failing the business action that triggered it.
 */
const sendMail = async (mail) => {
    try {
        return await deliverMail(mail);
    } catch (error) {
        console.error(`Failed to send email to ${mail.to}:`, error.message);
        return { sent: false, error: error.message };
    }
};

export { sendMail, deliverMail };
