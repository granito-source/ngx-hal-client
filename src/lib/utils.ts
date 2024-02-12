import { Collection, Resource } from './internal';

/**
 * Convert any item, be that a {@link Resource} or {@link Collection}
 * to a plain {@link Object} or {@link Array}. On conversion
 * HAL-related properties (`_client`, `_links`, `_embedded`)
 * are not included in the resulting object. Primitive types
 * as well as `null` or `undefined` are returned unchanged.
 * If the argument is an array, every item of the returned array
 * is converted recursively. For {@link Collection} it returns
 * the array of values where each item is converted recursively.
 *
 * @param item the item to convert
 * @returns an object, array, primitive value, `undefined` or `null`
 */
export function objectFrom(item: any): any {
    if (typeof item !== 'object' || item === null)
        return item;

    if (item instanceof Collection)
        return objectFrom(item.values);

    if (Array.isArray(item))
        return item.map(x => objectFrom(x));

    const { _client, _links, _embedded, ...object } = item;

    return object;
}

/**
 * @param arg argument to test
 * @returns `false` if the argument is `null` or `undefined` and `true`
 * otherwise
 */
export function isDefined<T>(arg: T | null | undefined):
    arg is T extends null | undefined ? never : T {
    return arg !== undefined && arg !== null;
}
