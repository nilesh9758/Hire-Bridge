// Single place for auth cookie settings.
// - httpOnly: JavaScript in the page can never read the tokens (limits XSS impact)
// - sameSite: 'strict' by default so other sites cannot make authenticated requests (CSRF).
//   Set COOKIE_SAMESITE=none (with HTTPS) only if the frontend and API live on different sites.
// - secure: always in production; on localhost browsers accept plain http.
const sameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
const secure = process.env.NODE_ENV === 'production' || sameSite === 'none' || process.env.COOKIE_SECURE === 'true';

const DAY = 24 * 60 * 60 * 1000;
const parseDays = (value, fallbackDays) => {
    const match = /^(\d+)d$/.exec(String(value || ''));
    return (match ? Number(match[1]) : fallbackDays) * DAY;
};

const baseOptions = { httpOnly: true, secure, sameSite, path: '/' };

const setAuthCookies = (res, { accessToken, refreshToken }) => {
    res.cookie('accessToken', accessToken, { ...baseOptions, maxAge: parseDays(process.env.ACCESS_TOKEN_EXPIRY, 1) });
    if (refreshToken) {
        res.cookie('refreshToken', refreshToken, { ...baseOptions, maxAge: parseDays(process.env.REFRESH_TOKEN_EXPIRY, 10) });
    }
    return res;
};

const clearAuthCookies = (res) => res.clearCookie('accessToken', baseOptions).clearCookie('refreshToken', baseOptions);

export { setAuthCookies, clearAuthCookies };
