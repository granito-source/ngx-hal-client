import { Collection } from './internal';

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
