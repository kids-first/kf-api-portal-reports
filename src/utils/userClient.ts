/* eslint-disable no-console */
import EsInstance from '../ElasticSearchClientInstance';
import { USERS_API_URL } from '../env';
import getAvailableBiospecimensFromSqon, {
    addConditionAvailableInSqon,
} from '../reports/utils/getAvailableBiospecimensFromSqon';
import { Output, Sqon } from './setsTypes';
import { UserApiError } from './userError';

const SET_URI = `${USERS_API_URL}/user-sets`;

export const createSet = async (accessToken: string, sqon: Sqon, biospecimenRequestName: string): Promise<void> => {
    console.time('biospecimen request create set');
    const wantedFields = ['biospecimen_id'];
    const esClient = EsInstance.getInstance();
    const ids = (await getAvailableBiospecimensFromSqon(esClient, sqon, accessToken, wantedFields)).map(
        (b) => b.biospecimen_id,
    );

    const payload = {
        alias: biospecimenRequestName,
        sharedPublicly: false,
        content: {
            ids,
            riffType: 'set',
            setType: 'biospecimen-request',
            sqon: addConditionAvailableInSqon(sqon),
            sort: [],
            idField: 'biospecimen_id',
        },
    };

    const response = await fetch(encodeURI(SET_URI), {
        method: 'post',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const body = await response.json();

    console.timeEnd('biospecimen request create set');

    if (response.status >= 300) {
        throw new UserApiError(response.status, body);
    }
};

export const getUserSets = async (accessToken: string): Promise<Output[]> => {
    const response = await fetch(encodeURI(SET_URI), {
        method: 'get',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (response.status === 200) {
        return body as Output[];
    }

    throw new UserApiError(response.status, body);
};

export const getSharedSet = async (accessToken: string, setId: string): Promise<Output> => {
    const uri = `${SET_URI}/shared/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'get',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (response.status === 200) {
        return body as Output;
    }

    throw new UserApiError(response.status, body);
};
