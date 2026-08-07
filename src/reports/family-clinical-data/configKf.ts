import { QueryConfig, ReportConfig, SheetConfig } from '../types';

const participants: SheetConfig = {
    sheetName: 'Participants',
    root: null,
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        { field: 'families_id', header: 'Family ID' },
        //TODO { field: '?', header: 'External Family ID' },
        { field: 'is_proband', header: 'Proband' },
        { field: 'study.study_name', header: 'Study Name' },
        { field: 'study.study_code', header: 'Study Code' },
        { field: 'family_type', header: 'Family Composition' },
        {
            field: 'family.relations_to_proband',
            header: 'Family Role',
            transform: (
                _: string,
                row: {
                    participant_id: string;
                    family: { relations_to_proband: { participant_id: string; role: string }[] };
                },
            ): string => {
                const ptId = row.participant_id;
                const relations = row?.family?.relations_to_proband ?? [];
                return relations.find((x) => x.participant_id === ptId)?.role ?? '';
            },
        },
        //TODO { field: '?', header: 'Diagnosis Category' },
        { field: 'sex', header: 'Sex' },
        { field: 'race', header: 'Race' },
        { field: 'ethnicity', header: 'Ethnicity' },
        { field: 'outcomes.vital_status', header: 'Vital Status' },
        { field: 'outcomes.age_at_event_days.value', header: 'Age at Last Vital Status (Days)' },
    ],
    sort: [{ families_id: 'asc' }, { participant_id: 'asc' }],
};

const phenotypes: SheetConfig = {
    sheetName: 'Phenotypes',
    root: 'phenotype',
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        { field: 'families_id', header: 'Family ID' },
        //TODO { field: '?', header: 'External Family ID'  },
        { field: 'is_proband', header: 'Proband' },
        {
            field: 'phenotype.is_observed',
            additionalFields: ['phenotype.hpo_phenotype_observed', 'phenotype.hpo_phenotype_not_observed'],
            header: 'Phenotype (HPO)',
            transform: (
                isObserved: boolean,
                row: { phenotype: { hpo_phenotype_observed: string; hpo_phenotype_not_observed: string } },
            ) => {
                if (!row.phenotype) {
                    return undefined;
                }
                return isObserved ? row.phenotype.hpo_phenotype_observed : row.phenotype.hpo_phenotype_not_observed;
            },
        },
        { field: 'phenotype.source_text', header: 'Phenotype (Source Text)' },
        {
            field: 'phenotype.is_observed',
            header: 'Interpretation',
            transform: (value: boolean) => (value ? 'Observed' : 'Not Observed'),
        },
        { field: 'phenotype.age_at_event_days', header: 'Age at Phenotype Assignment (Days)' },
    ],
    sort: [{ families_id: 'asc' }, { participant_id: 'asc' }],
};

const diagnoses: SheetConfig = {
    sheetName: 'Diagnoses',
    root: 'diagnosis',
    columns: [
        { field: 'participant_id', header: 'Participant ID' },
        { field: 'external_id', header: 'External Participant ID' },
        { field: 'families_id', header: 'Family ID' },
        { field: 'is_proband', header: 'Proband' },
        { field: 'diagnosis.mondo_display_term', header: 'Diagnosis (MONDO)' },
        {
            field: 'diagnosis.ncit_display_term',
            header: 'Diagnosis (NCIT)',
        },
        { field: 'diagnosis.source_text', header: 'Diagnosis (Source Text)' },
        { field: 'diagnosis.age_at_event_days', header: 'Age at Diagnosis (Days)' },
        { field: 'diagnosis.source_text_tumor_location', header: 'Tumor Location (Source Text)' },
    ],
    sort: [{ families_id: 'asc' }, { participant_id: 'asc' }],
};

export const queryConfigs: QueryConfig = {
    alias: 'participant_centric',
};

export const sheetConfigs: SheetConfig[] = [participants, phenotypes, diagnoses];

const reportConfig: ReportConfig = { queryConfigs, sheetConfigs };

export default reportConfig;
