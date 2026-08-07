// Clean-room SQON→ES query, replacing @arranger/middleware. Ported from
// post-arranger; verified byte-identical to 2.16.1 via bench/sqon-diff/.

export { default as buildQuery } from './buildQuery';
export { default as esToSafeJsInt } from './utils/esToSafeJsInt';
