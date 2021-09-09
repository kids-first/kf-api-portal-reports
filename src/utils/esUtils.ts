import { Client } from '@elastic/elasticsearch';
import noop from 'lodash/noop';
import defaults from 'lodash/defaults';
import esToSafeJsInt from '@kfarranger/middleware/dist/utils/esToSafeJsInt';

type SearchOpts = {
  onPageFetched(data: object[], page: number): void;
  onFinish(totalRaw: number):void;
  pageSize: number;
};
/**
 * Recursively calls the `search` on the given elasticsearch.Client,
 *  using the `search_after` mechanism.
 * @param {Object} es - an elasticsearch.Client object.
 * @param {String} index - the name of the index (or alias) on which to search.
 * @param {Object} query - an object containing the query,
 *  and any other property to use in the body of the search request.
 * @param opts.onPageFetched {function(object[], Number):void} - a callback to be called on each page of data fetched,
 *  passing the fetched data and the total number of rows returned yet.
 * @param opts.onFinish {function():void} - a callback that is called after the last page has been fetched,
 *  passing the total number of rows.
 * @param opts.pageSize {Number} - the requested number of results per page, defaults to 1000.
 *  The number of results per page may vary from that number.
 *  If a `size` property is provided in the query, it has precedence over this option.
 */
export const executeSearchAfterQuery = async (es: Client, index: string, query, opts: SearchOpts) => {
  opts = defaults(opts, {
    onPageFetched: noop,
    onFinish: noop,
    pageSize: 1000,
  });

  // wrap values in an object to prevent closure bugs
  let progress = {
    total: 0,
    fetched: 0,
  };

  const fetchNextPage = async (sort = null) => {
    const searchParams = {
      index,
      body: {
        ...query,
        // "size" is necessary to activate "search_after"
        size: query.size || opts.pageSize,
      },
    };

    // omit "search_after" on first call
    if (sort) {
      searchParams.body.search_after = sort.map(toSafeESValue);
    }

    let page;
    try {
      page = await es.search(searchParams);
    } catch (err) {
      console.error(`Error searching ES with params ${JSON.stringify(searchParams)}`, err);
      throw err;
    }
    progress.total = page.body.hits.total;
    const pageSize = page.body.hits.hits.length;
    progress.fetched += pageSize;

    // a page may be empty if data has been removed from the search results in between two calls,
    //  preventing this search from reaching fetched = total.
    // Be sure not to go in an infinite loop if that happen.
    if (pageSize > 0) {
      opts.onPageFetched(page.body.hits.hits.map(hit => hit._source), progress.total);
    }
    if (progress.fetched >= progress.total || pageSize === 0) {
      opts.onFinish(progress.total);
      return;
    }

    await fetchNextPage(page.body.hits.hits[pageSize - 1].sort);
  };

  let otherPagesPromise;
  try {
    otherPagesPromise = await fetchNextPage();
  } catch (err) {
    console.error(`Failed to search ES for index: ${index}, query: ${JSON.stringify(query)}`, err);
    throw err;
  }

  return otherPagesPromise;
};

/**
 * Calls the `search` on the given elasticsearch.Client to get a single page of results.
 * @param {Object} es - an elasticsearch.Client object.
 * @param {String} index - the name of the index (or alias) on which to search.
 * @param {Object} query - an object containing the query,
 */
export const executeSearch = async (es, index, query) => {
  const searchParams = {
    index,
    body: {
      ...query,
      size: typeof query.size === 'number' ? query.size : 0,
    },
  };

  try {
    return await es.search(searchParams);
  } catch (err) {
    console.error(`Error searching ES with params ${JSON.stringify(searchParams)}`, err);
    throw err;
  }
};

/**
 * Cleans a value so it can be accepted by ES.
 * e.g. Numbers below Number.MAX_SAFE_INTEGER have to be capped and represented in string, to avoid precision loss.
 * @see https://github.com/elastic/elasticsearch-js/issues/662
 * @param {any} value - any value to be validated.
 * @returns {any} the clean value. Might be of a different type than the input.
 */
export const toSafeESValue = value => {
  // Cap unsafe number
  if (Number.isInteger(Number.parseFloat(value)) && !Number.isSafeInteger(value)) {
    const bigValue = BigInt(value);
    const bigMaxValue = BigInt(2 ** 63 - 1);
    const bigMinValue = BigInt(-(2 ** 63 - 1));
    if (bigValue < bigMinValue) {
      return String(bigMinValue);
    }
    if (bigValue > bigMaxValue) {
      return String(bigMaxValue);
    }
    return String(bigValue);
  }

  // Value is already safe
  return value;
};

/**
 * Get a transform function to convert from the given ES field type
 *  to a human readable value.
 */
export const getDefaultTransformPerType = (fieldType: string, fieldName: string): any => {
  switch (fieldType) {
    case 'boolean':
      return defaultBoolTransform;
    case 'id':
    case 'keyword':
    case 'text':
      return x => (x === null ? '' : String(x));
    case 'float':
    case 'integer':
    case 'long':
      return x => esToSafeJsInt(x);
    // case 'date':
    // case 'nested':
    // case 'object':
    default:
      console.warn(`Unsupported type "${fieldType}" encountered in field "${fieldName}"`);
      return x => x;
  }
};

const defaultBoolTransform = value => {
  switch (String(value).toLowerCase()) {
    case 'true':
      return 'Yes';
    case 'false':
      return 'No';
    case 'null':
      return '';
    default:
      return String(value);
  }
};
