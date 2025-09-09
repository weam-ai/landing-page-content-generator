import config from './credencial_config';

const ironOptions = {
    cookieName: config.cookieName,
    password: config.cookiePassword,
    cookieOptions: {
        httpOnly: true,
        secure: false,
    },
};

export default ironOptions;
