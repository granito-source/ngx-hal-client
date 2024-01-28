import { Type } from '@angular/core';
import { Observable, map, of, pipe, switchMap, takeUntil } from 'rxjs';
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
 * RxJS operator producing a new observable that emits the values emitted
 * by the source {@link Observable} until the lifetime {@link Observable}
 * completes.
 *
 * @param lifetime the lifetime observable
 * @returns a function that transforms the source {@link Observable}
 */
export function completeWith<T>(lifetime: Observable<any>):
    (observable: Observable<T>) => Observable<T> {
    const terminator$ = new Observable<void>(subscriber =>
        lifetime.subscribe().add(() => subscriber.next()));

    return pipe(takeUntil(terminator$));
}

/**
 * RxJS operator to follow a link on a {@link Resource}. It is
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
    (observable: Observable<Resource>) => Observable<Accessor | undefined> {
    return pipe(
        map(resource => resource.follow(rel, params))
    );
}

/**
 * RxJS operator to read a collection of resources using an
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
    (observable: Observable<Accessor | undefined>) => Observable<Collection<T> | undefined> {
    return pipe(
        switchMap(accessor => !accessor ? of(undefined) :
            accessor.readCollection(type))
    );
}
