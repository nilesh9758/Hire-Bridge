// Vercel serverless entry: every /api/* request is routed here (see vercel.json)
// and handled by the same Express app used for local development.
import { app } from "../server/server/src/app.js";
import { connectdb } from "../server/server/src/db/connection.db.js";
import { ensureAdmin } from "../server/server/src/utils/ensureAdmin.js";

let ready = null;

const init = () => {
    if (!ready) {
        ready = connectdb()
            .then(ensureAdmin)
            .catch((error) => {
                ready = null; // retry on the next request
                throw error;
            });
    }
    return ready;
};

export default async function handler(req, res) {
    try {
        await init();
    } catch (error) {
        console.error("Startup failed:", error.message);
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ statusCode: 503, success: false, message: "Service temporarily unavailable" }));
        return;
    }
    return app(req, res);
}
