import { QueryConfig, ReportConfig, SheetConfig } from "../types";

const biospecimens: SheetConfig = {
    sheetName: 'Biospecimens',
    root: 'biospecimens',
    columns: [
        { field: 'kf_id' },
        { field: 'external_id' },
        { field: 'biospecimens.kf_id' },
        { field: 'biospecimens.external_sample_id' },
        { field: 'biospecimens.external_aliquot_id' },
        { field: 'biospecimens.age_at_event_days' },
        { field: 'biospecimens.composition' },
        { field: 'biospecimens.analyte_type' },
        { field: 'biospecimens.concentration_mg_per_ml' },
        { field: 'biospecimens.volume_ul' },
        { field: 'biospecimens.shipment_date' },
        { field: 'biospecimens.shipment_origin' },
        { field: 'biospecimens.sequencing_center_id' },
        { field: 'biospecimens.consent_type' },
        { field: 'biospecimens.dbgap_consent_code' },
        { field: 'biospecimens.method_of_sample_procurement' },
        { field: 'biospecimens.source_text_tumor_descriptor' },
        { field: 'biospecimens.ncit_id_anatomical_site' },
        { field: 'biospecimens.ncit_id_tissue_type' },
        { field: 'biospecimens.source_text_anatomical_site' },
        { field: 'biospecimens.source_text_tissue_type' },
        { field: 'biospecimens.uberon_id_anatomical_site' },
        { field: 'biospecimens.spatial_descriptor' },
    ],
    sort: [
        // TODO : SORT BY biospecimens.kf_id
        {
            'biospecimens.kf_id': {
                order: 'asc',
            },
        },
        {
            kf_id: {
                order: 'asc',
            },
        },
    ],
};

const queryConfigs: QueryConfig = {
    indexName: 'participant',
    alias: 'participant_centric',
};

const sheetConfigs: SheetConfig[] = [biospecimens];

const reportConfig: ReportConfig = {queryConfigs, sheetConfigs};

export default reportConfig;
