import { Request, Response } from 'express';

import { version, name, description } from '../../package.json';
import { ES_HOST } from '../env';

export default (_req: Request, res: Response) => {
    return res.send({
        name,
        version,
        description,
        elasticsearch: ES_HOST,
    });
};
