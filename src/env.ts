import dotenv from 'dotenv';

dotenv.config();

// Port of this service
export const PORT = process.env.PORT || 4000;

// ElasticSearch host
export const ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
export const ES_USER = process.env.ES_USER;
export const ES_PWD = process.env.ES_PASS;

// ElasticSearch queries parameters
export const ES_PAGESIZE: number = Number(process.env.ES_PAGESIZE) || 1000;
export const ES_QUERY_MAX_SIZE: number = Number(process.env.ES_QUERY_MAX_SIZE) || 10000;

// Project
export const PROJECT: string = process.env.PROJECT || 'kids-first';

export const esFileAlias = process.env.ES_FILE_ALIAS || 'file';

// Keycloak configs
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const USERS_API_URL = process.env.USERS_API_URL || 'https://users-api-qa.373997854230.d3b.io';
