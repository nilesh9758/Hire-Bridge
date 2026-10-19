import rateLimit, { MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis, isRedisEnabled } from "../db/redis.db.js";

// Counts in Redis, shared by every server instance (the default in-memory store counts
// per instance, which on serverless or multi-instance hosting multiplies an attacker's
// attempts). While Redis is unreachable it counts in memory instead of failing open.
class RedisStoreWithFallback extends RedisStore {
    constructor(options) {
        super(options);
        this.memory = new MemoryStore();
    }

    async init(options) {
        this.memory.init(options);
        await super.init(options).catch((error) => {
            console.warn("Rate limiter: Redis unavailable at startup, counting in memory:", error.message);
        });
    }

    // If the scripts failed to load (Redis was down), their promises stay rejected;
    // load them again so the store recovers once Redis is back
    reloadScripts() {
        this.incrementScriptSha = this.loadIncrementScript();
        this.getScriptSha = this.loadGetScript();
        this.incrementScriptSha.catch(() => {});
        this.getScriptSha.catch(() => {});
    }

    async increment(key) {
        try {
            return await super.increment(key);
        } catch {
            this.reloadScripts();
            return this.memory.increment(key);
        }
    }

    async decrement(key) {
        await super.decrement(key).catch(() => this.memory.decrement(key));
    }

    async resetKey(key) {
        await Promise.all([super.resetKey(key).catch(() => {}), this.memory.resetKey(key)]);
    }

    async get(key) {
        return super.get(key).catch(() => this.memory.get(key));
    }
}

const sendCommand = (command, ...args) => {
    const redis = getRedis();
    if (!redis) return Promise.reject(new Error("Redis unavailable"));
    return redis.call(command, ...args);
};

const store = (name) =>
    isRedisEnabled() ? new RedisStoreWithFallback({ prefix: `rl:${name}:`, sendCommand }) : undefined;

const shared = (name) => ({
    store: store(name),
    // Last resort if the store itself errors: let requests through rather than locking everyone out
    passOnStoreError: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const json = (message) => ({ statusCode: 429, success: false, message, data: null, errors: [] });

// Brute-force protection: only failed logins count toward the limit
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    ...shared("login"),
    message: json("Too many failed login attempts. Please try again in 15 minutes."),
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    ...shared("register"),
    message: json("Too many accounts created from this network. Please try again later."),
});

const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    ...shared("sensitive"),
    message: json("Too many requests. Please try again later."),
});

export { loginLimiter, registerLimiter, sensitiveActionLimiter };
