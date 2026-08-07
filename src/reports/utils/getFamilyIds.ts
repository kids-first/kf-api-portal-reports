import { Client } from '@elastic/elasticsearch';
import noop from 'lodash/noop';

import { ES_PAGESIZE, ES_QUERY_MAX_SIZE } from '../../env';
import { esFileIndex } from '../../esVars';
import { executeSearch, executeSearchAfterQuery } from '../../utils/esUtils';

interface IFileInfo {
    data_type: string;
    families_id: string;
}

/** Get IFileInfo: files data_types and families_id */
const getFilesInfo = async (fileIds: string[], es: Client): Promise<IFileInfo[]> => {
    const esRequest = {
        query: { bool: { must: [{ terms: { file_id: fileIds, boost: 0 } }] } },
        _source: ['file_id', 'data_type', 'participants.families_id'],
        sort: [{ data_type: { order: 'asc' } }],
    };
    const sources: any[] = [];
    await executeSearchAfterQuery(es, esFileIndex, esRequest, {
        onPageFetched: (pageHits) => {
            sources.push(...pageHits);
        },
        onFinish: noop,
        pageSize: ES_PAGESIZE,
    });

    const filesInfos = [];
    sources.forEach((source) => {
        source.participants &&
            source.participants.forEach((participant) => {
                if (
                    participant.families_id &&
                    !filesInfos.find(
                        (f) => f.families_id === participant.families_id && f.data_type === source.data_type,
                    )
                ) {
                    filesInfos.push({
                        data_type: source.data_type,
                        families_id: participant.families_id || '',
                    });
                }
            });
    });
    return filesInfos;
};

/** for each filesInfos iteration, get files from file.participants.families_id and file.data_type */
const getFilesIdsMatched = async (filesInfos: IFileInfo[], es: Client): Promise<string[]> => {
    const filesIdsMatched = [];
    const results = await Promise.all(
        filesInfos.map((info) => {
            const esRequest = {
                query: {
                    bool: {
                        must: [
                            { terms: { data_type: [info.data_type], boost: 0 } },
                            {
                                nested: {
                                    path: 'participants',
                                    query: {
                                        bool: { must: [{ match: { 'participants.families_id': info.families_id } }] },
                                    },
                                },
                            },
                        ],
                    },
                },
                _source: ['file_id'],
                size: ES_QUERY_MAX_SIZE,
            };
            return executeSearch(es, esFileIndex, esRequest);
        }),
    );

    for (const res of results) {
        const hits = res?.body?.hits?.hits || [];
        const sources = hits.map((hit) => hit._source);
        filesIdsMatched.push(...sources.map((s) => s.file_id));
    }

    return filesIdsMatched;
};

/**
 *
 * @param es
 * @param fileIds
 */
const getFamilyIds = async (es: Client, fileIds: string[]): Promise<string[]> => {
    const filesInfos = await getFilesInfo(fileIds, es);
    const filesIdsMatched = await getFilesIdsMatched(filesInfos, es);

    return [...new Set([...fileIds, ...filesIdsMatched])];
};

export default getFamilyIds;
