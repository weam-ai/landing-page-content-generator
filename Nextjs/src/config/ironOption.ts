import config from './frontend-config';

const ironOptions = {
    cookieName: config.cookieName,
    password: config.cookiePassword,
    cookieOptions: {
        httpOnly: true,
        secure: false,
    },
};

export default ironOptions;
