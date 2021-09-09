import dotenv from 'dotenv';

dotenv.config();

// Port of this service
export const PORT = process.env.PORT || 4000;

// ElasticSearch host
export const ES_HOST = process.env.ES_HOST || 'kf-arranger-es-prd.kids-first.io:9200';
// ElasticSearch queries parameters
export const ES_PAGESIZE: number = Number(process.env.ES_PAGESIZE) || 1000;

// Keycloak configs
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';
