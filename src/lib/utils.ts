import { Type } from '@angular/core';
import { Observable, OperatorFunction, filter, map, of, pipe, switchMap, takeUntil } from 'rxjs';
import { Accessor, Collection, Params, Resource } from './internal';

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
 * Returns an RxJS operator that makes the source {@link Observable}
 * complete at the same time as the lifetime {@link Observable}.
 *
 * @param lifetime the lifetime observable
 * @returns a function that transforms the source {@link Observable}
 */
export function completeWith<T>(lifetime: Observable<any>):
    OperatorFunction<T, T> {
    const terminator$ = new Observable<void>(subscriber =>
        lifetime.subscribe().add(() => subscriber.next()));

    return pipe(takeUntil(terminator$));
}

/**
 * Returns an RxJS operator to follow a link on a {@link Resource}. It is
 * equivalent to
 * ```ts
 * map(resource -> resource.follow(rel, params))
 * ```
 *
 * @param rel the relation to follow
 * @param params the parameters to expand the link (optional)
 * @returns a function that transforms the source {@link Observable}
 */
export function follow(rel: string, params?: Params | undefined):
    OperatorFunction<Resource, Accessor | undefined> {
    return pipe(
        map(resource => resource.follow(rel, params))
    );
}

/**
 * Returns an RxJS operator to read a collection of resources using an
 * {@link Accessor}. It is equivalent to
 * ```ts
 * switchMap(accessor => of(undefined))
 * ```
 * if `accessor` is `null` or `undefined` and to
 * ```ts
 * switchMap(accessor => accessor.readCollection(type))
 * ```
 * otherwise.
 *
 * @param type the collection element type
 * @returns a function that transforms the source {@link Observable}
 */
export function readCollection<T extends Resource>(type: Type<T>):
    OperatorFunction<Accessor | undefined, Collection<T> | undefined> {
    return pipe(
        switchMap(accessor => !accessor ? of(undefined) :
            accessor.readCollection(type))
    );
}

/**
 * Returns an RxJS operator to filter out `null` and `undefined` items
 * from the source {@link Observable}.
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function defined<T>():
    OperatorFunction<T | null | undefined, T extends null | undefined ? never : T> {
    return pipe(
        filter(isDefined)
    );
}

function isDefined<T>(arg: T | null | undefined):
    arg is T extends null | undefined ? never : T {
    return arg !== undefined && arg !== null;
}
