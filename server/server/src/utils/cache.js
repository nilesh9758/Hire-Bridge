import { getRedis } from "../db/redis.db.js";

// Read-through cache on Redis. Every operation degrades to a plain database read
// when Redis is not configured or not reachable, so the cache can never break a request.
// Cached values go through JSON: ObjectIds and Dates come back as strings.

const CacheKeys = {
    activeJobs: "cache:jobs:active",
    notices: (audience) => `cache:notices:${audience}`,
    allNotices: () => ["students", "recruiters", "admin"].map((audience) => `cache:notices:${audience}`),
    user: (role, id) => `cache:user:${role}:${id}`,
};

const warn = (action, error) => console.warn(`Cache ${action} failed:`, error.message);

const cached = async (key, ttlSeconds, load) => {
    const redis = getRedis();
    if (!redis) return load();

    try {
        const hit = await redis.get(key);
        if (hit !== null) return JSON.parse(hit);
    } catch (error) {
        warn("read", error);
    }

    const value = await load();
    try {
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
        warn("write", error);
    }
    return value;
};

// Awaited on purpose: on serverless hosts work left running after the response may never finish
const invalidate = async (...keys) => {
    const redis = getRedis();
    if (!redis || keys.length === 0) return;
    try {
        await redis.del(...keys);
    } catch (error) {
        warn("invalidate", error);
    }
};

// Mongoose plugin: drops cached entries whenever a document is written.
// keysFor(id) returns the keys to delete; id is undefined when a query has no _id filter.
const QUERY_WRITES = ["findOneAndUpdate", "findOneAndDelete", "findOneAndReplace", "updateOne", "deleteOne", "replaceOne"];

const invalidateOnWrite = (schema, { keysFor, queries = QUERY_WRITES }) => {
    schema.post("save", async function (doc) {
        await invalidate(...keysFor(doc._id));
    });
    schema.post("deleteOne", { document: true, query: false }, async function (doc) {
        await invalidate(...keysFor(doc._id));
    });
    schema.post(queries, { document: false, query: true }, async function (result) {
        const id = result?._id ?? this.getFilter()._id;
        await invalidate(...keysFor(id));
    });
};

export { CacheKeys, cached, invalidate, invalidateOnWrite };
