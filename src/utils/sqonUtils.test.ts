/* eslint-disable @typescript-eslint/no-var-requires */
import { ProjectType } from '../reports/types';
import { getRiffs, Riff } from './riffClient';
import { Output as UserSetOutput, Sqon } from './setsTypes';
import { resolveSetsInSqon, retrieveSetsFromUsers } from './sqonUtils';
import { getSharedSet, getUserSets } from './userClient';

jest.mock('./riffClient');
jest.mock('./userClient');
jest.mock('../env');

describe('resolveSetsInSqon - legacy KF', () => {
    beforeEach(() => {
        (getRiffs as jest.Mock).mockReset();
        const env = require('../env');
        env.PROJECT = ProjectType.kidsFirst;
    });

    it('should return the input sqon if not set id in it', async () => {
        const inputSqonWithoutSetId: Sqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'gender',
                        value: ['Female'],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithoutSetId, 'userId', 'access_token');

        expect(result).toEqual(inputSqonWithoutSetId);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(0);
    });

    it('should replace set id by its content', async () => {
        const inputSqonWithSetIds: Sqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ez'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ey'],
                    },
                },
            ],
        };

        const riff1ez: Riff = {
            id: '1ez',
            alias: 'tag-1ez',
            content: {
                ids: ['participant_1', 'participant_2'],
                sqon: { op: 'and', content: [] },
                riffType: 'set',
                setType: 'participant',
                idField: 'fhir_id',
                sort: [],
            },
            sharedPublicly: false,
            uid: 'uid-1ez',
            creationDate: new Date(),
            updatedDate: new Date(),
        };

        const riff1ey: Riff = {
            id: '1ey',
            alias: 'tag-1ey',
            content: {
                ids: ['participant_1', 'participant_3'],
                sqon: { op: 'and', content: [] },
                riffType: 'set',
                setType: 'participant',
                idField: 'fhir_id',
                sort: [],
            },
            sharedPublicly: false,
            uid: 'uid-1ey',
            creationDate: new Date(),
            updatedDate: new Date(),
        };

        const anotherRiff: Riff = {
            id: '1ea',
            alias: 'tag-1ea',
            content: {
                ids: ['participant_2', 'participant_3'],
                sqon: { op: 'and', content: [] },
                riffType: 'set',
                setType: 'participant',
                idField: 'fhir_id',
                sort: [],
            },
            sharedPublicly: false,
            uid: 'uid-1ea',
            creationDate: new Date(),
            updatedDate: new Date(),
        };

        const getRiffsMockResponse = [riff1ey, anotherRiff, riff1ez];

        (getRiffs as jest.Mock).mockImplementation(() => getRiffsMockResponse);

        const expectedResult: Sqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_3'],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithSetIds, 'userId', 'access_token');

        expect(result).toEqual(expectedResult);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('should replace set id by an empty array if it has not any set content matching to it', async () => {
        const inputSqonWithSetIds: Sqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ez'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ex'],
                    },
                },
            ],
        };

        const riff1ez: Riff = {
            id: '1ez',
            alias: 'tag-1ez',
            content: {
                ids: ['participant_1', 'participant_2'],
                sqon: { op: 'and', content: [] },
                riffType: 'set',
                setType: 'participant',
                idField: 'fhir_id',
                sort: [],
            },
            sharedPublicly: false,
            uid: 'uid-1ez',
            creationDate: new Date(),
            updatedDate: new Date(),
        };

        const anotherRiff: Riff = {
            id: '1ea',
            alias: 'tag-1ea',
            content: {
                ids: ['participant_2', 'participant_3'],
                sqon: { op: 'and', content: [] },
                riffType: 'set',
                setType: 'participant',
                idField: 'fhir_id',
                sort: [],
            },
            sharedPublicly: false,
            uid: 'uid-1ea',
            creationDate: new Date(),
            updatedDate: new Date(),
        };

        const getRiffsMockResponse = [anotherRiff, riff1ez];

        (getRiffs as jest.Mock).mockImplementation(() => getRiffsMockResponse);

        const expectedResult: Sqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: [],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithSetIds, 'userId', 'access_token');

        expect(result).toEqual(expectedResult);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
    });
});

describe('retrieveSetsFromUsers', () => {
    beforeEach(() => {
        (getUserSets as jest.Mock).mockReset();
        (getSharedSet as jest.Mock).mockReset();
        const env = require('../env');
        env.PROJECT = ProjectType.include;
    });

    const setIds = ['setId1', 'setId2'];
    const setId1: UserSetOutput = {
        id: 'setId1',
        alias: 'my first set',
        content: {
            ids: ['participant_1', 'participant_2'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: 'set',
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const setId2: UserSetOutput = {
        id: 'setId2',
        alias: 'my second set',
        content: {
            ids: ['participant_3', 'participant_4'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: 'set',
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const sharedSet: UserSetOutput = {
        id: 'sharedSet',
        alias: 'not my set',
        content: {
            ids: ['participant_5', 'participant_6'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: 'set',
            setType: 'participant',
        },
        sharedpublicly: true,
        keycloak_id: 'uid-2ab',
        creation_date: new Date(),
        updated_date: new Date(),
    };

    it('should include user sets', async () => {
        (getUserSets as jest.Mock).mockImplementation(() => [setId1, setId2]);

        const result = await retrieveSetsFromUsers('access_token', setIds);

        expect(result.length).toEqual(2);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2]));
        expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
        expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(0);
    });

    it('should add all shared sets', async () => {
        (getUserSets as jest.Mock).mockImplementation(() => [setId1, setId2]);
        (getSharedSet as jest.Mock).mockImplementation(() => sharedSet);

        const result = await retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet']);

        expect(result.length).toEqual(3);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2, sharedSet]));

        expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
        expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('should fail if the shared set is not public (ie not returned by users-api)', async () => {
        (getUserSets as jest.Mock).mockImplementation(() => [setId1, setId2]);
        (getSharedSet as jest.Mock).mockImplementation(() => {
            throw new Error('User Set #sharedSet does not exist.');
        });

        try {
            await retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet']);
        } catch (e) {
            expect(e.message).toEqual('User Set #sharedSet does not exist.');
        } finally {
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(1);
        }
    });
});
