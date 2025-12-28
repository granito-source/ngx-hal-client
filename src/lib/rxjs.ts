import { Type } from '@angular/core';
import { filter, map, Observable, OperatorFunction, pipe, switchMap,
    takeUntil } from 'rxjs';
import { Accessor, Collection, isDefined, Params,
    Resource } from './internal';

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
 * map(resource => resource.follow(rel, params))
 * ```
 *
 * @param rel the relation to follow
 * @param params the parameters to expand the link
 * @returns a function that transforms the source {@link Observable}
 */
export function follow(rel: string, params?: Params):
    OperatorFunction<Resource, Accessor> {
    return pipe(map(resource => resource.follow(rel, params)));
}

/**
 * Returns an RxJS operator to create a new resource identified by
 * an {@link Accessor} or a {@link Resource}. It is equivalent to
 * ```ts
 * switchMap(x => x.create(obj))
 * ```
 *
 * @param obj the value for the resource
 * @returns a function that transforms the source {@link Observable}
 */
export function create(obj: any):
    OperatorFunction<Accessor | Resource, Accessor> {
    return pipe(switchMap(base => base.create(obj)));
}

/**
 * Returns an RxJS operator to read a {@link Resource} using an
 * {@link Accessor}. It is equivalent to
 * ```ts
 * switchMap(accessor => accessor.read(type))
 * ```
 *
 * @param type the resource type
 * @returns a function that transforms the source {@link Observable}
 */
export function read<T extends Resource>(type: Type<T>):
    OperatorFunction<Accessor, T> {
    return pipe(switchMap(accessor => accessor.read(type)));
}

/**
 * Returns an RxJS operator to read a {@link Collection} of resources
 * using an {@link Accessor}. It is equivalent to
 * ```ts
 * switchMap(accessor => accessor.readCollection(type))
 * ```
 *
 * @param type the collection element type
 * @returns a function that transforms the source {@link Observable}
 */
export function readCollection<T extends Resource>(type: Type<T>):
    OperatorFunction<Accessor, Collection<T>> {
    return pipe(switchMap(accessor => accessor.readCollection(type)));
}

/**
 * Returns an RxJS operator to refresh a {@link Resource} or
 * {@link Collection} of resources. It is equivalent to
 * ```ts
 * switchMap(resource => resource.read())
 * ```
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function refresh<T extends Resource>(): OperatorFunction<T, T> {
    return pipe(switchMap(resource => resource.read()));
}

/**
 * Returns an RxJS operator to clone a {@link Resource} and modify
 * the cloned instance using the provided update function. It is
 * equivalent to
 * ```ts
 * map(resource => resource.mutate(update))
 * ```
 *
 * @param update the update function to apply
 * @returns a function that transforms the source {@link Observable}
 */
export function mutate<T extends Resource>(update: (x: T) => void):
    OperatorFunction<T, T> {
    return pipe(map(resource => resource.mutate(update)));
}

/**
 * Returns an RxJS operator to update a {@link Resource}.
 * It is equivalent to
 * ```ts
 * switchMap(resource => resource.update())
 * ```
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function update<T extends Resource>(): OperatorFunction<T, T> {
    return pipe(switchMap(resource => resource.update()));
}

/**
 * Returns an RxJS operator to delete a resource identified by
 * an {@link Accessor} or a {@link Resource}. It is equivalent to
 * ```ts
 * switchMap(x => x.delete())
 * ```
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function del(): OperatorFunction<Accessor | Resource, void> {
    return pipe(switchMap(base => base.delete()));
}

/**
 * Returns an RxJS operator to filter out `null` and `undefined` items
 * from the source {@link Observable}.
 *
 * @returns a function that transforms the source {@link Observable}
 */
export function defined<T>():
    OperatorFunction<T | null | undefined, T extends null | undefined ? never : T> {
    return pipe(filter(isDefined));
}
