const ironOptions = {
    cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'iron-session',
    password: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'default-password-change-in-production',
    cookieOptions: {
        httpOnly: true,
        secure: false,
    },
};

export default ironOptions;
