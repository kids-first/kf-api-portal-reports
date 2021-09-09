import cors from 'cors';
import express, { Application } from 'express';
import Keycloak, { KeycloakConfig } from 'keycloak-connect';

import { ES_HOST } from './env';
import { unknownEndpointHandler, globalErrorLogger, globalErrorHandler } from './errors';
import reportsEndpoint from './reports';
import statusEndpoint from './status';

export default function(keycloakConfig: KeycloakConfig): Application {
    const keycloak = new Keycloak({}, keycloakConfig);
    const app = express();

    app.use(
        cors({
            exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
        }),
    );

    app.use(
        keycloak.middleware({
            logout: '/logout',
            admin: '/',
        }),
    );

    app.use(express.json({ limit: '10mb' }));

    // Health check endpoint
    app.get('/status', statusEndpoint);
    app.get('/', statusEndpoint);

    // endpoints to generate the reports
    app.use('/reports', keycloak.protect(), reportsEndpoint(ES_HOST));

    app.use(globalErrorLogger, unknownEndpointHandler, globalErrorHandler);

    return app;
}
