import { ES_MAX_LONG } from '../constants';

// Clamp JS-unsafe integers to ES_MAX_LONG; everything else (incl. numeric strings)
// passes through. Matches @arranger/middleware/dist/utils/esToSafeJsInt.
const esToSafeJsInt = (x: any): any => (Number.isInteger(x) && !Number.isSafeInteger(x) ? ES_MAX_LONG : x);

export default esToSafeJsInt;
