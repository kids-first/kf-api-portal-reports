import { KEYCLOAK_CLIENT, KEYCLOAK_REALM, KEYCLOAK_URL } from './env';

const keycloakConfig = {
    realm: KEYCLOAK_REALM,
    'confidential-port': 0,
    'bearer-only': true,
    'auth-server-url': KEYCLOAK_URL,
    'ssl-required': 'external',
    resource: KEYCLOAK_CLIENT,
};

export default keycloakConfig;
