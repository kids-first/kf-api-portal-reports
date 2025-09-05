import { esBiospecimenIndex } from '../../esVars';
import { BioRequestConfig, QueryConfig, ReportConfig, SheetConfig } from '../types';

const contact: SheetConfig = {
    sheetName: 'Contact Info',
    root: null,
    columns: [
        { field: 'study.study_code', header: 'Study Code' },
        { field: 'study.biobank_contact', header: 'Biobank Contact' },
        { field: 'study.biobank_request_link', header: 'Request Weblink' },
    ],
    sort: [
        {
            'study.study_code': {
                order: 'asc',
            },
        },
    ],
};

const generateStudyTab: (study_code: string) => SheetConfig = (study_code) =>
    ({
        sheetName: study_code,
        root: null,
        columns: [
            { field: 'external_sample_id', header: 'External Sample ID' },
            { field: 'sample_id', header: 'KF Sample ID' },
            { field: 'sample_type', header: 'Sample Type' },
            { field: 'parent_sample_id', header: 'KF Parent Sample ID' },
            { field: 'parent_sample_type', header: 'Parent Sample Type' },
            { field: 'sdg_id', header: 'External Collection ID' },
            { field: 'collection_sample_id', header: 'KF Collection ID' },
            { field: 'collection_sample_type', header: 'Collection Sample Type' },
            { field: 'participant.external_id', header: 'External Participant ID' },
            { field: 'participant.participant_id', header: 'KF Participant ID' },
            { field: 'study.study_code', header: 'Study Code' },
            { field: 'participant.sex', header: 'Sex' },
            { field: 'participant.race', header: 'Race' },
            { field: 'age_at_biospecimen_collection', header: 'Age at Biospecimen Collection (Days)' },
            { field: 'volume', header: 'Volume' },
            { field: 'volume_unit', header: 'Volume Unit' },
            { field: 'collection_method_of_sample_procurement', header: 'Method of Sample Procurement' },
            { field: 'diagnoses.mondo_display_term', header: 'Histological Diagnosis (MONDO)' },
            { field: 'diagnoses.ncit_display_term', header: 'Histological Diagnosis (NCIT)' },
            { field: 'diagnoses.source_text', header: 'Histological Diagnosis (Source Text)' },
            { field: 'diagnoses.source_text_tumor_location', header: 'Tumor Location (Source Text)' },
            { field: 'collection_ncit_anatomy_site', header: 'Anatomical Site (NCIT)' },
            { field: 'collection_anatomy_site', header: 'Anatomical Site (Source Text)' },
        ],
        sort: [
            {
                'study.study_code': {
                    order: 'asc',
                },
            },
            {
                biospecimen_id: {
                    order: 'asc',
                },
            },
        ],
    }) as SheetConfig;

const queryConfigs: QueryConfig = {
    indexName: 'biospecimen',
    alias: esBiospecimenIndex,
};

const wantedFields = [
    'biospecimen_id',
    'external_sample_id',
    'sample_id',
    'sample_type',
    'parent_sample_id',
    'parent_sample_type',
    'sdg_id',
    'collection_sample_id',
    'collection_sample_type',
    'participant.external_id',
    'participant.participant_id',
    'study.study_code',
    'study.study_name',
    'study.biobank_contact',
    'study.biobank_request_link',
    'study.note',
    'participant.sex',
    'participant.race',
    'age_at_biospecimen_collection',
    'volume',
    'volume_unit',
    'collection_method_of_sample_procurement',
    'diagnoses.mondo_display_term',
    'diagnoses.ncit_display_term',
    'diagnoses.source_text',
    'diagnoses.source_text_tumor_location',
    'collection_ncit_anatomy_site',
    'collection_anatomy_site',
];

const sheetConfigs: SheetConfig[] = [contact];

const reportConfig: ReportConfig = { queryConfigs, sheetConfigs };

const fileNamePrefix = 'kf';

// eslint-disable-next-line max-len
const readmeContent = `# Kids First Biospecimen Request Report - README \n\nThis README provides information on accessing and requesting biospecimens from the Kids First biobanks. The report generated will provide contact information for each biobank along with their respective sheet listing all selected samples available for requests. To initiate the process, please follow the instructions per study below. \n\n## Instructions for Biospecimen Requests per study`;

const bioRequestConfig: BioRequestConfig = {
    reportConfig,
    fileNamePrefix,
    readmeContent,
    wantedFields,
    contact,
    generateStudyTab,
};

export default bioRequestConfig;
