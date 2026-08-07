import { esBiospecimenIndex } from '../../esVars';
import { QueryConfig, ReportConfig, SheetConfig } from '../types';

const biospecimens: SheetConfig = {
    sheetName: 'Biospecimens',
    root: null,
    columns: [
        { field: 'participant.participant_id', header: 'Participant ID' },
        { field: 'participant.external_id', header: 'External Participant ID' },
        { field: 'collection_sample_id', header: 'Collection ID' },
        { field: 'sdg_id', header: 'External Collection ID' },
        { field: 'collection_sample_type', header: 'Collection Sample Type' },
        { field: 'sample_id', header: 'Sample ID' },
        { field: 'external_sample_id', header: 'External Sample ID' },
        { field: 'sample_type', header: 'Sample Type' },
        { field: 'parent_sample_id', header: 'Parent Sample ID' },
        { field: 'parent_sample_type', header: 'Parent Sample Type' },
        { field: 'study.study_code', header: 'Study Code' },
        { field: 'age_at_biospecimen_collection', header: 'Age at Biospecimen Collection (Days)' },
        { field: 'status', header: 'Sample Availability' },
        { field: 'volume', header: 'Volume' },
        { field: 'volume_unit', header: 'Volume Unit' },
        { field: 'preservation_method', header: 'Preservation Method' },
        { field: 'collection_method_of_sample_procurement', header: 'Method of Sample Procurement' },
        { field: 'tumor_status', header: 'Tumor Status' },
        { field: 'diagnoses.mondo_display_term', header: 'Histological Diagnosis (MONDO)' },
        { field: 'diagnoses.ncit_display_term', header: 'Histological Diagnosis (NCIT)' },
        { field: 'diagnoses.source_text', header: 'Histological Diagnosis (Source Text)' },
        { field: 'diagnoses.source_text_tumor_location', header: 'Tumor Location (Source Text)' },
        { field: 'diagnoses.source_text_tumor_descriptor', header: 'Tumor Descriptor' },
        { field: 'has_matched_normal_sample', header: 'Paired Normal Sample' },
        { field: 'collection_ncit_anatomy_site', header: 'Anatomical Site (NCIT)' },
        { field: 'collection_anatomy_site', header: 'Anatomical Site (Source Text)' },
        { field: 'consent_type', header: 'Consent Type' },
        { field: 'dbgap_consent_code', header: 'dbGaP Consent Code' },
        { field: 'files.sequencing_experiment.sequencing_center_id', header: 'Sequencing Center ID' },
    ],
    // sample_id (official FHIR sample identifier, unique per biospecimen doc) is the tiebreaker:
    // search_after needs a fully-deterministic sort or it can skip/duplicate rows at page boundaries.
    sort: [{ 'participant.participant_id': 'asc' }, { sample_id: 'asc' }],
};

const queryConfigs: QueryConfig = {
    alias: esBiospecimenIndex,
};

const sheetConfigs: SheetConfig[] = [biospecimens];

const reportConfig: ReportConfig = { queryConfigs, sheetConfigs };

export default reportConfig;
