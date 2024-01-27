import { Type } from '@angular/core';
import { EMPTY, Observable, map, pipe, switchMap } from 'rxjs';
import { Accessor, Collection, Params, Resource } from './internal';

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

export function follow(rel: string, params?: Params | undefined):
    (observable: Observable<Resource>) => Observable<Accessor | undefined> {
    return pipe(
        map(resource => resource.follow(rel, params))
    );
}

export function readCollection<T extends Resource>(type: Type<T>):
    (observable: Observable<Accessor | undefined>) => Observable<Collection<T>> {
    return pipe(
        switchMap(accessor => !accessor ? EMPTY :
            accessor.readCollection(type))
    );
}
