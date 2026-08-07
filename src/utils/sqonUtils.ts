import { Dictionary, flattenDeep, get, isArray, zipObject } from 'lodash';

import { Output as UserSetOutput, Sqon } from './setsTypes';
import { getSharedSet, getUserSets } from './userClient';

export const resolveSetsInSqon = async (sqon: Sqon, accessToken: string): Promise<Sqon> => {
    const setIds: string[] = getSetIdsFromSqon(sqon || ({} as Sqon));
    if (setIds.length) {
        const userSets: UserSetOutput[] = await retrieveSetsFromUsers(accessToken, setIds);

        const ids = setIds.map((setId) => get(userSets.filter((r) => r.id === setId)[0], 'content.ids', []));
        const setIdsToValueMap: Dictionary<string[]> = zipObject(
            setIds.map((id) => `set_id:${id}`),
            ids,
        );

        return injectIdsIntoSqon(sqon, setIdsToValueMap);
    } else {
        return sqon;
    }
};

const injectIdsIntoSqon = (sqon: Sqon, setIdsToValueMap: Dictionary<string[]>) => ({
    ...sqon,
    content: sqon.content.map((op) => ({
        ...op,
        content: !isArray(op.content)
            ? {
                  ...op.content,
                  value: isArray(op.content.value)
                      ? flattenDeep(op.content.value.map((value) => setIdsToValueMap[value] || op.content.value))
                      : setIdsToValueMap[op.content.value] || op.content.value,
              }
            : injectIdsIntoSqon(op, setIdsToValueMap).content,
    })),
});

const getSetIdsFromSqon = (sqon: Sqon, collection = []) =>
    (isArray(sqon.content)
        ? flattenDeep(
              sqon.content.reduce((acc, subSqon) => [...acc, ...getSetIdsFromSqon(subSqon, collection)], collection),
          )
        : isArray(sqon.content?.value)
          ? sqon.content.value.filter((value) => String(value).indexOf('set_id:') === 0)
          : [...(String(sqon.content?.value).indexOf?.('set_id:') === 0 ? [sqon.content.value] : [])]
    ).map((setId) => setId.replace('set_id:', ''));

export const retrieveSetsFromUsers = async (accessToken: string, setIds: string[]): Promise<UserSetOutput[]> => {
    // Get all user sets
    const userSets = await getUserSets(accessToken);
    const userSetsIds = userSets.map((us) => us.id);

    for (const setId of setIds) {
        // if set is a shared set, fetch it and add it to user sets
        if (!userSetsIds.includes(setId)) {
            const sharedSet = await getSharedSet(accessToken, setId);
            userSets.push(sharedSet);
            userSetsIds.push(sharedSet.id);
        }
    }

    return userSets;
};
