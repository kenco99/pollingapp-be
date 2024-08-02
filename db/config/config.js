require('dotenv').config();

const env = process.env;
const getEnv = (key, defaultValue) => {
    const value = env[key];
    if (value === undefined) {
        console.warn(`Warning: Environment variable ${key} is not set. Using default value.`);
        return defaultValue;
    }
    return value;
};

module.exports = {
    dialect: 'postgres',
    port: 5432,
    logging: false,
    replication: {
        read: [
            {
                database: getEnv('DB_NAME', 'postgres'),
                host: getEnv('DB_HOST', 'localhost'),
                username: getEnv('DB_USER', 'postgres'),
                password: getEnv('DB_PASS', ''),
            },
        ],
        write: {
            database: getEnv('DB_NAME', 'postgres'),
            host: getEnv('DB_HOST', 'localhost'),
            username: getEnv('DB_USER', 'postgres'),
            password: getEnv('DB_PASS', ''),
        },
    },
    pool: {
        max: 50,
        min: 0,
        acquire: 30000,
        idle: 1000,
    },
};
