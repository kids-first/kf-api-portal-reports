import { formatFileSize } from '../../utils/formatFileSize';
import { SheetConfig } from '../types';

type BiospecimenData = {
    family?: { family_id?: string };
    sample_id?: string;
    external_sample_id?: string;
    container_id?: string;
    external_collection_sample_id?: string;
};
type BiospecimenDataWithoutFamily = Omit<BiospecimenData, 'family'>;

type ParticipantsData = {
    biospecimens: BiospecimenData[];
}[];
const processBiospecimens = (participants: ParticipantsData, key: keyof BiospecimenDataWithoutFamily): string[] =>
    Array.from(
        new Set(
            (participants || [])
                .map((x) => x?.biospecimens || [])
                .flat()
                .map((x) => x[key])
                .filter((x) => !!x),
        ),
    );

const config: SheetConfig = {
    sheetName: 'Files',
    root: null,
    columns: [
        { field: 'access_urls', header: 'Access URL' },
        {
            field: 'file_id',
            header: 'File ID',
        },
        { field: 'file_name', header: 'File Name' },
        { field: 'size', header: 'File Size', transform: (value) => formatFileSize(value, { output: 'string' }) },
        { field: 'data_category', header: 'Data Category' },
        { field: 'data_type', header: 'Data Type' },
        { field: 'file_format', header: 'File Format' },
        { field: 'sequencing_experiment.experiment_strategy', header: 'Experimental Strategy' },
        { field: 'hashes.md5', header: 'Hash' },
        { field: 'study.study_name', header: 'Study Name' },
        { field: 'dataset_names', header: 'Dataset' },
        { field: 'participants.participant_id', header: 'Participant ID' },
        {
            fieldExtraSuffix: '_sample_id',
            field: 'participants',
            header: 'Sample ID',
            transform: (participants) => processBiospecimens(participants, 'sample_id'),
        },
        {
            fieldExtraSuffix: '_container_id',
            field: 'participants',
            header: 'INCLUDE Container ID',
            transform: (participants) => processBiospecimens(participants, 'container_id'),
        },
        {
            fieldExtraSuffix: '_down_syndrome_status',
            field: 'participants',
            header: 'Down Syndrome Status',
            transform: (participants) => (participants || []).map((x) => x?.down_syndrome_status ?? ''),
        },
        {
            fieldExtraSuffix: '_family',
            field: 'participants',
            header: 'Family ID',
            transform: (participants) => (participants || []).map((x) => x?.family?.family_id ?? ''),
        },
        {
            fieldExtraSuffix: '_external_id',
            field: 'participants',
            header: 'External Participant ID',
            transform: (participants) => (participants || []).map((x) => x?.external_id ?? ''),
        },
        {
            fieldExtraSuffix: '_external_sample_id',
            field: 'participants',
            header: 'External Sample ID',
            transform: (participants) => processBiospecimens(participants, 'external_sample_id'),
        },
        {
            fieldExtraSuffix: '_external_collection_sample_id',
            field: 'participants',
            header: 'External Collection ID',
            transform: (participants) => processBiospecimens(participants, 'external_collection_sample_id'),
        },
    ],
    sort: [{ file_id: { order: 'asc' } }],
};

export default config;
