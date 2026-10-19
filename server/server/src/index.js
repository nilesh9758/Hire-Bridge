// Loads .env before any other module reads process.env
import "dotenv/config";
import mongoose from "mongoose";

import { connectdb } from "./db/connection.db.js";
import { closeRedis } from "./db/redis.db.js";
import { closeEmailQueue } from "./queues/email.queue.js";
import { app } from "./app.js";
import { ensureAdmin } from "./utils/ensureAdmin.js";

app.get("/", (req, res) => {
  res.send("<h1>Hello World!</h1>");
});

connectdb()
  .then(ensureAdmin)
  .then(() => {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Listening on port : ${PORT}`);
    });

    // Finish in-flight requests before exiting (rolling deploys, container restarts)
    const shutdown = (signal) => {
      console.log(`${signal} received - shutting down`);
      server.close(async () => {
        await Promise.all([closeEmailQueue(), closeRedis(), mongoose.disconnect()]);
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((error) => {
    console.log("MongoDB connection error!!!", error);
  });
