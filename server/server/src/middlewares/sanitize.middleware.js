// Removes keys that start with "$" or contain "." from request data, so client input
// can never smuggle MongoDB query operators (e.g. {"email": {"$ne": null}}) into queries.
const clean = (value) => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        for (const key of Object.keys(value)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete value[key];
            } else {
                value[key] = clean(value[key]);
            }
        }
    }
    return value;
};

const sanitizeRequest = (req, res, next) => {
    clean(req.body);
    clean(req.params);
    clean(req.query);
    next();
};

export { sanitizeRequest };
