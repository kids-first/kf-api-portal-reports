import { QueryConfig, ReportConfig, SheetConfig } from '../types';

const participants: SheetConfig = {
    sheetName: 'Participants',
    root: null,
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        { field: 'families_id', header: 'Family ID' },
        { field: 'family_type', header: 'Family Unit' },
        { field: 'study.study_name', header: 'Study Name' },
        { field: 'study.study_id', header: 'Study Code' },
        { field: 'sex' },
        { field: 'race' },
        { field: 'ethnicity' },
        { field: 'down_syndrome_status' },
        { field: 'outcomes.vital_status', header: 'Vital Status' },
        {
            field: 'outcomes.age_at_event_days.value',
            header: 'Age at the Last Vital Status (Days)',
        },
        {
            field: 'age_at_first_patient_engagement.value',
            header: 'Age at First Patient Engagement (Days)',
        },
    ],
    sort: [
        {
            fhir_id: {
                order: 'asc',
            },
        },
        {
            'diagnosis.age_at_event_days': {
                order: 'desc',
            },
        },
    ],
};

const phenotypes: SheetConfig = {
    sheetName: 'Phenotypes',
    root: 'phenotype',
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        {
            field: 'phenotype.hpo_phenotype_observed',
            additionalFields: ['phenotype.hpo_phenotype_not_observed'],
            header: 'Phenotype (HPO)',
            transform: (
                value: string,
                row: { phenotype: { hpo_phenotype_not_observed: string } },
            ): undefined | string => {
                if (!row.phenotype) {
                    return;
                }
                return value || row.phenotype.hpo_phenotype_not_observed;
            },
        },
        {
            field: 'phenotype.source_text',
            header: 'Condition (Source Text)',
        },
        {
            field: 'phenotype.hpo_phenotype_observed',
            header: 'Interpretation',
            transform: (value: string): string => (value ? 'Observed' : 'Not Observed'),
        },
        {
            field: 'phenotype.age_at_event_days',
            header: 'Age at Phenotype Assignment (Days)',
        },
    ],
    sort: [{ fhir_id: 'asc' }],
};

const diagnoses: SheetConfig = {
    sheetName: 'Diagnoses',
    root: 'diagnosis',
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        { field: 'diagnosis.mondo_display_term', header: ' Diagnosis (MONDO)' },
        { field: 'diagnosis.source_text', header: 'Condition (Source Text)' },
        {
            field: 'diagnosis.age_at_event_days',
            header: 'Age at Diagnosis (Days)',
        },
    ],
    sort: [{ fhir_id: 'asc' }],
};

const familyRelationship: SheetConfig = {
    sheetName: 'Family Relationship',
    root: 'family.relations_to_proband',
    columns: [
        {
            field: 'family.relations_to_proband.participant_id',
            header: 'Participant ID',
            additionalFields: ['participant_id'],
            transform: (value: string, row: { participant_id: string }) => value ?? row.participant_id,
        },
        {
            field: 'family.family_id',
            header: 'Family ID',
        },
        {
            field: 'family.relations_to_proband.role',
            header: 'Family Role',
        },
    ],
    sort: [{ participant_id: 'asc' }],
};

export const queryConfigs: QueryConfig = {
    indexName: 'participant',
    alias: 'participant_centric',
};

export const sheetConfigs: SheetConfig[] = [participants, phenotypes, diagnoses, familyRelationship];

const reportConfig: ReportConfig = { queryConfigs, sheetConfigs };

export default reportConfig;
