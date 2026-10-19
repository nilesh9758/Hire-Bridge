import { Redis } from "ioredis";

// Redis is optional. Without REDIS_URL the app behaves exactly as before: no caching,
// in-memory (per-instance) rate limits and emails sent inline.
// Works with any Redis 6.2+, including managed ones such as Upstash (rediss://...).
const isRedisEnabled = () => Boolean(process.env.REDIS_URL);

const createRedisConnection = (options = {}) => {
    const connection = new Redis(process.env.REDIS_URL, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        ...options,
    });
    connection.on("error", (error) => console.error("Redis error:", error.message));
    return connection;
};

// Shared connection for caching and rate limiting (one per process, reused across
// warm serverless invocations)
let client = null;
// Set while the connection is broken. ioredis keeps reconnecting in the background;
// meanwhile callers skip Redis instead of waiting on the reconnect backoff.
let down = false;

const getClient = () => {
    if (!isRedisEnabled()) return null;
    if (!client) {
        client = createRedisConnection();
        client.on("ready", () => { down = false; });
        client.on("close", () => { down = true; });
    }
    return client;
};

// The shared client, or null when Redis is disabled or currently unreachable
const getRedis = () => {
    const redis = getClient();
    return redis && !down ? redis : null;
};

// "disabled", "up" or "down", for the health check
const redisStatus = async () => {
    if (!isRedisEnabled()) return "disabled";
    const redis = getRedis();
    if (!redis) return "down";
    return redis.ping().then(() => "up", () => "down");
};

const closeRedis = async () => {
    if (client) {
        await client.quit().catch(() => {});
        client = null;
    }
};

export { isRedisEnabled, createRedisConnection, getRedis, redisStatus, closeRedis };
