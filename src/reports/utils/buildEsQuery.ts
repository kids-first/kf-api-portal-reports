import { ExtendedEntry } from '../../arranger/deriveExtendedFromMapping';
import { buildQuery } from '../../arranger/sqon';
import { getNestedFields } from '../../utils/arrangerUtils';
import { Sqon } from '../../utils/setsTypes';
import { resolveSetsInSqon } from '../../utils/sqonUtils';

// Compose an ES query from an extended config + SQON: derive nested fields,
// resolve set_ids to literal ids, then buildQuery. `transformSqon` lets callers
// inject conditions after set resolution (e.g. status=available).
export const buildEsQueryFromSqon = async (
    extendedConfig: ExtendedEntry[],
    sqon: Sqon,
    accessToken: string,
    transformSqon: (resolved: Sqon) => Sqon = (resolved) => resolved,
): Promise<Record<string, any>> => {
    const nestedFields = getNestedFields(extendedConfig);
    const resolvedSqon = await resolveSetsInSqon(sqon, accessToken);
    return buildQuery({ nestedFields, filters: transformSqon(resolvedSqon) });
};

export default buildEsQueryFromSqon;
