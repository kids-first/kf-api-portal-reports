import { PROJECT } from '../../env';
import { ProjectType } from '../types';

// Pick the INCLUDE or Kids-First variant of a report config from PROJECT.
// Anything that isn't INCLUDE resolves to Kids-First (the default project — see
// env.ts, where PROJECT defaults to 'kids-first').
export const resolveProjectConfig = <T>(includeConfig: T, kfConfig: T): T =>
    PROJECT.toLowerCase().trim() === ProjectType.include ? includeConfig : kfConfig;

export default resolveProjectConfig;
