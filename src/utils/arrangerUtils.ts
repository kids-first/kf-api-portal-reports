import flatten from 'lodash/flatten';
import isEmpty from 'lodash/isEmpty';
import isPlainObject from 'lodash/isPlainObject';

/**
 * Extracts the fields path for fields of type "nested".
 * @param {Object} extendedConfigs - the extended configurations from the mappings.
 * @returns {string[]} - an array of fields path.
 */
export const getNestedFields = (extendedConfigs) =>
    extendedConfigs.filter(({ type }) => type === 'nested').map(({ field }) => field);

/**
 * Like `lodash.get`, but supports paths containing arrays.
 * In the case of a path containing one or more array, the results will be flattened.
 * @param {object} source - a row in an ES response
 * @param {String} path - the path to the field
 * @param {String} defaultValue - (optional) the value to be returned if the field is not found or null
 * @returns {any|any[]} a single value, or a flattened array of scalar values if the path contains an array
 */
export const findValueInField = (source, path, defaultValue = null) => {
    const pathSegments = path.split('.');
    const result = pathSegments.reduce((value, segment) => {
        if (Array.isArray(value)) {
            return flatten(value)
                .map((v) => v[segment])
                .filter((v) => v !== undefined);
        }
        return value && value[segment];
    }, source);
    return result === undefined ? defaultValue : result;
};

/**
 * Recursive function that breaks the targeted element into its irreducible parts (e.g [{}, {}, {}] => [{}] [{}] [ {}])
 * and returns an array where each element is the source object modified only at its targeted path in such a way that
 * each value pointed by this path is an irreducible part of the targeted element.
 *
 * @examples

  1) for path = 'a.b.c.d',
    { a: b: { c : [ { d: 1 }, { d: 2 } ] } } => [{ a: b: { c : { d: 1 } } }, { a: b: { c : { d: 2 } } }]

  2) for path = 'b.c.d'
     {  a: 1,b: {c: [{ d: 1}, { d: 2}]}, e: 4} => [ {a: 1, b: {c: {d: 1}}, e: 4}, {a: 1, b: {c: {d: 2}}, e: 4} ]

 * @param {object} source - any object
 * @param {object} currentLevel - the name of a property of `source`
 * @param {array} segments - path split (a.b => ['a', 'b'])`
 * @returns {object[]}
 *
 */
const deepObjectMapFromNode = (source, currentLevel, segments) => {
    const currentPathName = segments.slice(0, 1);
    const nextPath = segments.slice(1);
    const hasNextPath = nextPath.length > 0;

    const currentValues = currentLevel[currentPathName];

    const flattenUntilIrreducibility = (currentNode) => {
        const irreducible = deepObjectMapFromNode(source, currentNode, nextPath);
        return irreducible.map((deepestTarget) => ({
            ...currentLevel,
            [currentPathName]: deepestTarget,
        }));
    };

    if (!Array.isArray(currentValues)) {
        if (isPlainObject(currentValues) && !isEmpty(currentValues) && hasNextPath) {
            // deeper level(s) to explore
            return flattenUntilIrreducibility({ ...currentValues });
        }
        // deepest level targeted has been reached
        return [currentLevel];
    }

    return currentValues.reduce((result, item) => [...result, ...flattenUntilIrreducibility(item)], []);
};

/**
 * Wrapper around generateColumnsForProperty
 * @param {object} source - any object
 * @param {string} path - the name of a property of `source`
 * @returns {object[]}
 */
export const generateColumnsForProperty = (source, path) => {
    const pathSegments = path.split('.');
    return deepObjectMapFromNode(source, source, pathSegments);
};
