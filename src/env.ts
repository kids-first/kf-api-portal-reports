import dotenv from 'dotenv';

dotenv.config();

// Port of this service
export const PORT = process.env.PORT || 4000;

// ElasticSearch host
export const ES_HOST = process.env.ES_HOST || 'kf-arranger-es-prd.kids-first.io:9200';
export const ES_USER = process.env.ES_USER;
export const ES_PWD = process.env.ES_PASS;

// ElasticSearch queries parameters
export const ES_PAGESIZE: number = Number(process.env.ES_PAGESIZE) || 1000;
export const ES_QUERY_MAX_SIZE: number = Number(process.env.ES_QUERY_MAX_SIZE) || 10000;

// Project
export const PROJECT: string = process.env.PROJECT || 'kids-first';

export const esFileIndex = process.env.ES_FILE_INDEX || 'file_centric';
export const esFileAlias = process.env.ES_FILE_ALIAS || 'file';

export const esBiospecimenIndex = process.env.ES_BIOSPECIMEN_INDEX || 'biospecimen_centric';
export const esBiospecimenAlias = process.env.ES_BIOSPECIMEN_ALIAS || 'biospecimen';

// Keycloak configs
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const RIFF_URL = process.env.RIFF_URL || 'https://riff-qa.kf-strides.org';
