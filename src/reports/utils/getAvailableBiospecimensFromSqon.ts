import { Client } from '@elastic/elasticsearch';

import { getExtendedFromMapping } from '../../arranger/deriveExtendedFromMapping';
import { ES_QUERY_MAX_SIZE } from '../../env';
import { esBiospecimenIndex } from '../../esVars';
import { executeSearch } from '../../utils/esUtils';
import { Sqon } from '../../utils/setsTypes';
import buildEsQueryFromSqon from './buildEsQuery';

// Retrieve available biospecimen docs matching `sqon` (adds status=available), returning `_source` fields.
const getAvailableBiospecimensFromSqon = async (
    es: Client,
    sqon: Sqon,
    accessToken: string,
    fieldsWanted: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => {
    const extendedConfig = await getExtendedFromMapping(es, esBiospecimenIndex);
    const query = await buildEsQueryFromSqon(extendedConfig, sqon, accessToken, addConditionAvailableInSqon);
    const results = await executeSearch(es, esBiospecimenIndex, {
        query,
        size: ES_QUERY_MAX_SIZE,
        _source: fieldsWanted,
    });
    const hits = results?.body?.hits?.hits || [];
    const sources = hits.map((hit) => hit._source);
    return sources;
};

export const addConditionAvailableInSqon = (sqon: Sqon): Sqon => ({
    ...sqon,
    content: [
        ...sqon.content,
        {
            content: {
                field: 'status',
                index: 'biospecimen',
                value: ['available'],
            },
            op: 'in',
        },
    ],
});

export default getAvailableBiospecimensFromSqon;
