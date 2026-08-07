import { Client } from '@elastic/elasticsearch';
import noop from 'lodash/noop';

import { getExtendedFromMapping } from '../../arranger/deriveExtendedFromMapping';
import { ES_PAGESIZE } from '../../env';
import { esFileIndex } from '../../esVars';
import { executeSearchAfterQuery } from '../../utils/esUtils';
import { Sqon } from '../../utils/setsTypes';
import { SheetConfig } from '../types';
import buildEsQueryFromSqon from './buildEsQuery';

// Fetch file docs matching `sqon`, returning the requested `_source` fields per file.
const getFilesFromSqon = async (
    es: Client,
    reportConfig: SheetConfig,
    sqon: Sqon,
    accessToken: string,
    fieldsWanted: string[],
): Promise<any[]> => {
    const extendedConfig = await getExtendedFromMapping(es, esFileIndex);
    const query = await buildEsQueryFromSqon(extendedConfig, sqon, accessToken);
    const esQuery = { query, _source: fieldsWanted, sort: reportConfig.sort };

    const results: any[] = [];

    await executeSearchAfterQuery(es, esFileIndex, esQuery, {
        onPageFetched: (pageHits) => {
            results.push(...pageHits);
        },
        onFinish: noop,
        pageSize: ES_PAGESIZE,
    });

    return results;
};

export default getFilesFromSqon;
