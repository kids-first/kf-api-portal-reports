/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { reportGenerationErrorHandler } from '../../errors';
import getAvailableBiospecimensFromSqon from '../utils/getAvailableBiospecimensFromSqon';

interface IBiospecimenDataByStudy {
    study_code: string;
    study_name: string;
    nb_participants: number;
    nb_available_samples: number;
    nb_containers: number;
}

const biospecimenRequestStats = async (req: Request, res: Response): Promise<void> => {
    console.time('biospecimenRequestStats');

    const { sqon } = req.body;
    const accessToken = req.headers.authorization;

    const wantedFields = ['sample_id', 'study.study_code', 'study.study_name', 'participant_fhir_id', 'container_id'];

    const esClient = EsInstance.getInstance();

    try {
        const availableBiospecimens = await getAvailableBiospecimensFromSqon(esClient, sqon, accessToken, wantedFields);

        /** Join available biospecimens by study_code */
        const biospecimenDatasByStudy: IBiospecimenDataByStudy[] = [];
        for (const biospecimen of availableBiospecimens) {
            const biospecimenForStudy = availableBiospecimens.filter(
                ({ study }) => study.study_code === biospecimen.study.study_code,
            );
            if (!biospecimenDatasByStudy.some((f) => f.study_code === biospecimen.study.study_code)) {
                biospecimenDatasByStudy.push({
                    study_code: biospecimen.study.study_code,
                    study_name: biospecimen.study.study_name,
                    nb_participants: countDistinct(biospecimenForStudy.map((b) => b.participant_fhir_id)),
                    nb_available_samples: countDistinct(biospecimenForStudy.map((b) => b.sample_id)),
                    nb_containers: countDistinct(biospecimenForStudy.map((b) => b.container_id).filter((c) => c)),
                });
            }
        }

        res.send(biospecimenDatasByStudy);
    } catch (err) {
        reportGenerationErrorHandler(err);
    }

    console.timeEnd('biospecimenRequestStats');
};

const countDistinct = (array: string[]) => new Set(array).size;

export default biospecimenRequestStats;
