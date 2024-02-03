import { Type } from '@angular/core';
import { Observable, OperatorFunction, filter, map, of, pipe, switchMap,
    takeUntil } from 'rxjs';
import { Accessor, Collection, HalBase, Params, Resource,
    isDefined } from './internal';

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
 * @param params the parameters to expand the link
 * @returns a function that transforms the source {@link Observable}
 */
export function follow(rel: string, params?: Params | undefined):
    OperatorFunction<Resource | null | undefined, Accessor | undefined> {
    return pipe(
        map(resource => resource?.follow(rel, params))
    );
}

/**
 * Returns an RxJS operator to create a new resource using an
 * {@link Accessor} or {@link Resource}. It is equivalent to
 * ```ts
 * switchMap(x => of(undefined))
 * ```
 * if the stream value is `null` or `undefined` and to
 * ```ts
 * switchMap(x => x.create(obj))
 * ```
 * otherwise.
 *
 * @param obj the value for the resource
 * @returns a function that transforms the source {@link Observable}
 */
export function create(obj: any):
    OperatorFunction<HalBase | undefined, Accessor | undefined> {
    return pipe(
        switchMap(base => !base ? of(undefined) : base.create(obj))
    );
}

/**
 * Returns an RxJS operator to read a {@link Resource} using an
 * {@link Accessor}. It is equivalent to
 * ```ts
 * switchMap(accessor => of(undefined))
 * ```
 * if `accessor` is `null` or `undefined` and to
 * ```ts
 * switchMap(accessor => accessor.read(type))
 * ```
 * otherwise.
 *
 * @param type the resource type
 * @returns a function that transforms the source {@link Observable}
 */
export function read<T extends Resource>(type: Type<T>):
    OperatorFunction<Accessor | null | undefined, T | undefined> {
    return pipe(
        switchMap(accessor => !accessor ? of(undefined) :
            accessor.read(type))
    );
}

/**
 * Returns an RxJS operator to read a {@link Collection} of resources
 * using an {@link Accessor}. It is equivalent to
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
    OperatorFunction<Accessor | null | undefined, Collection<T> | undefined> {
    return pipe(
        switchMap(accessor => !accessor ? of(undefined) :
            accessor.readCollection(type))
    );
}

/**
 * Returns an RxJS operator to refresh a {@link Resource} or
 * {@link Collection} of resources. It is equivalent to
 * ```ts
 * switchMap(resource => of(undefined))
 * ```
 * if `resource` is `null` or `undefined` and to
 * ```ts
 * switchMap(resource => resource.read())
 * ```
 * otherwise.
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function refresh<T extends Resource>():
    OperatorFunction<T | null | undefined, T | undefined> {
    return pipe(
        switchMap(resource => !resource ? of(undefined) : resource.read())
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
