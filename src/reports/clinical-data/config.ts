import { QueryConfig, ReportConfig, SheetConfig } from "../types";

// TODO : comment all the fields to document it, also put it in README.md
const participants: SheetConfig = {
    sheetName: 'Participants',
    root: null,
    columns: [
        { field: 'kf_id' },
        { field: 'external_id' },
        { field: 'family_id' },
        { field: 'is_proband' },
        { field: 'study.short_name' },
        { field: 'family.family_compositions.composition' },
        { field: 'diagnosis_category' },
        { field: 'gender' },
        { field: 'race' },
        { field: 'ethnicity' },
        { field: 'outcome.vital_status' },
        {
            field: 'outcome.age_at_event_days',
            header: 'Age at the Last Vital Status (Days)',
        },
        { field: 'outcome.disease_related' },
        { field: 'affected_status' },
    ],
    sort: [
        // does not work:
        // see https://www.elastic.co/guide/en/elasticsearch/reference/current/fielddata.html
        {
            family_id: {
                order: 'asc',
            },
        },
        {
            kf_id: {
                order: 'asc',
            },
        },
        {
            'diagnoses.age_at_event_days': {
                order: 'desc',
            },
        },
    ],
};

const phenotypes: SheetConfig = {
    sheetName: 'Phenotypes',
    root: 'phenotype',
    columns: [
        { field: 'kf_id' },
        { field: 'external_id' },
        { field: 'is_proband' },
        {
            field: 'phenotype.observed',
            additionalFields: ['phenotype.hpo_phenotype_observed', 'phenotype.hpo_phenotype_not_observed'],
            header: 'Phenotype (HPO)',
            transform: (observed, row) => {
                if (!row.phenotype) {
                    return;
                }
                return observed ? row.phenotype.hpo_phenotype_observed : row.phenotype.hpo_phenotype_not_observed;
            },
        },
        {
            field: 'phenotype.observed',
            additionalFields: ['phenotype.snomed_phenotype_observed', 'phenotype.snomed_phenotype_not_observed'],
            header: 'Phenotype (SNOMED)',
            transform: (observed, row) => {
                if (!row.phenotype) {
                    return;
                }
                return observed ? row.phenotype.snomed_phenotype_observed : row.phenotype.snomed_phenotype_not_observed;
            },
        },
        { field: 'phenotype.source_text_phenotype' },
        {
            field: 'phenotype.observed',
            header: 'Interpretation',
            transform: (value, row) => (value ? 'Observed' : 'Not Observed'),
        },
        {
            field: 'phenotype.age_at_event_days',
            header: 'Age at Phenotype Assignment (Days)',
        },
    ],
    sort: [{ kf_id: 'asc' }],
};

// <Biospecimen ID> <External Sample ID> <External Aliquot ID>
const diagnoses: SheetConfig = {
    sheetName: 'Diagnoses',
    root: 'diagnoses',
    columns: [
        { field: 'kf_id' },
        { field: 'external_id' },
        { field: 'is_proband' },
        {
            field: 'kf_id',
            header: 'Diagnosis Type',
            transform: () => 'Clinical',
        },
        { field: 'diagnoses.diagnosis_category' },
        { field: 'diagnoses.mondo_id_diagnosis' },
        { field: 'diagnoses.ncit_id_diagnosis' },
        { field: 'diagnoses.source_text_diagnosis' },
        {
            field: 'diagnoses.age_at_event_days',
            header: 'Age at Diagnosis (Days)',
        },
        { field: 'diagnoses.source_text_tumor_location' },
    ],
    sort: [{ kf_id: 'asc' }],
};

const histologicalDiagnoses: SheetConfig = {
    sheetName: 'Histological Diagnoses',
    root: 'biospecimens.diagnoses',
    columns: [
        { field: 'kf_id' },
        { field: 'external_id' },
        { field: 'biospecimens.kf_id' },
        { field: 'biospecimens.external_sample_id' },
        { field: 'biospecimens.external_aliquot_id' },
        { field: 'is_proband' },
        {
            // This allows to do a cell with a static value.
            // The value will be formatted like the value of `field` would have.
            field: 'kf_id',
            header: 'Diagnosis Type',
            transform: () => 'Histological',
        },
        { field: 'biospecimens.diagnoses.diagnosis_category' },
        { field: 'biospecimens.diagnoses.mondo_id_diagnosis' },
        { field: 'biospecimens.diagnoses.ncit_id_diagnosis' },
        { field: 'biospecimens.diagnoses.source_text_diagnosis' },
        {
            field: 'biospecimens.diagnoses.age_at_event_days',
            header: 'Age at Diagnosis (Days)',
        },
        { field: 'biospecimens.diagnoses.source_text_tumor_location' },
        { field: 'biospecimens.source_text_anatomical_site' },
        { field: 'biospecimens.ncit_id_tissue_type' },
        { field: 'biospecimens.source_text_tissue_type' },
        { field: 'biospecimens.composition' },
        { field: 'biospecimens.method_of_sample_procurement' },
        { field: 'biospecimens.analyte_type' },
    ],
    sort: [
        { kf_id: 'asc' },
        {
            'biospecimens.diagnoses.age_at_event_days': {
                order: 'desc',
                nested: {
                    path: 'biospecimens',
                    nested: {
                        path: 'biospecimens.diagnoses',
                    },
                },
            },
        },
    ],
};

const familyRelationship: SheetConfig = {
    sheetName: 'Family Relationship',
    root: 'family.family_compositions.family_members',
    columns: [
        { field: 'kf_id' },
        { field: 'family.family_compositions.family_members.kf_id' },
        {
            field: 'family.family_compositions.family_members.relationship',
            header: 'Relationship',
            transform: value => value || 'self',
        },
    ],
    sort: [{ kf_id: 'asc' }],
};

export const queryConfigs: QueryConfig = {
    indexName: 'participant',
    alias: 'participant_centric',
};

export const sheetConfigs: SheetConfig[] = [participants, phenotypes, diagnoses, histologicalDiagnoses, familyRelationship];

const reportConfig: ReportConfig = {queryConfigs, sheetConfigs};

export default reportConfig;

