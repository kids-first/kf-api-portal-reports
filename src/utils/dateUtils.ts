export const getUTCDate = (dateString = Date.now()): Date => {
    const date = new Date(dateString);

    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    );
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

// Format local components as `yyyyMMddTHHmmssZ` (e.g. 20260710T143005Z). Replaces date-fns
// format(); callers pass getUTCDate(), whose local components hold the UTC wall-clock.
export const formatCompactStamp = (date: Date): string =>
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}Z`;
