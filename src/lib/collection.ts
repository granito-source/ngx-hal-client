import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Resource } from './resource';
import { Accessor } from './accessor';

const next = 'next';

/**
 * This class represents an in-memory collection of resources.
 */
export class Collection<T extends Resource> extends Resource {
    /**
     * Zero-based offset of the first element of the `values` array in
     * the collection.
     */
    readonly start: number;

    /**
     * A page of values of the collection starting with `start` offset.
     */
    readonly values: T[];

    /**
     * @param type the element resource type
     * @param obj the object used to assign the properties
     */
    constructor(private readonly type: Type<T>, obj: any) {
        super(obj);

        this.start = obj.start > 0 ? Math.trunc(obj.start) : 0;

        for (const rel in this._embedded) {
            const values = this._embedded[rel];

            if (Array.isArray(values)) {
                this.values = this.arrayOf(type, values);

                return;
            }
        }

        this.values = [];
    }

    next(): Accessor | undefined {
        const accessor = this.follow(next);

        return !!accessor && accessor.canRead ? accessor : undefined;
    }

    /**
     * Refresh the resource collection. In other words, read
     * the resource collection identified by `self` link.
     *
     * @returns an observable of the refreshed resource collection instance
     */
    override read(): Observable<this> {
        return this.withSelf(self => this._client.get(self).pipe(
            map(obj => new Collection(this.type, {
                ...obj,
                 _client: this._client
            }) as this),
            catchError(this.handleError)
        ));
    }
}
