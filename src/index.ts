/* eslint-disable no-console */
import buildApp from './app';
import { PORT } from './env';
import keycloakConfig from './keycloak';

process.on('uncaughtException', (err) => {
    console.log(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, `reason: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log(`Process ${process.pid} has been interrupted`);
    process.exit(0);
});

const app = buildApp(keycloakConfig);
app.listen(PORT, () => console.log(`⚡️⚡️⚡️ Listening on port ${PORT} ⚡️⚡️⚡️`));
