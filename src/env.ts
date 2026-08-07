// Env loaded via Node's --env-file-if-exists=.env in the `start` script (local dev); prod uses container env.

// Port of this service
export const PORT = process.env.PORT || 4000;

// ElasticSearch host
export const ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
export const ES_USER = process.env.ES_USER;
export const ES_PWD = process.env.ES_PASS;

// ElasticSearch queries parameters
// 1000 = measured sweet spot for the streaming single-scan path: fewer round trips than 100/500,
// while larger pages only hit a per-doc _source-load floor with no further wall-time gain.
export const ES_PAGESIZE: number = Number(process.env.ES_PAGESIZE) || 1000;
export const ES_QUERY_MAX_SIZE: number = Number(process.env.ES_QUERY_MAX_SIZE) || 10000;

// Project
export const PROJECT: string = process.env.PROJECT || 'kids-first';

// Max reports generating concurrently across ALL users (global cap; gentle on the ES cluster
// shared with the portal). Reports are ~430MB RSS each: 5 ≈ 2.1GiB, ~half the 4GiB container.
// Override via env to retune without a code change.
export const MAX_CONCURRENT_REPORTS: number = Number(process.env.MAX_CONCURRENT_REPORTS) || 5;

export const esFileAlias = process.env.ES_FILE_ALIAS || 'file';

// Keycloak configs
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const USERS_API_URL = process.env.USERS_API_URL || 'https://users-api-qa.373997854230.d3b.io';
