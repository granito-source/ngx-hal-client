import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Resource } from './resource';

/**
 * This class represents an in-memory collection of resources.
 */
export class Collection<T extends Resource> extends Resource {
    /**
     * The elements of the collection.
     */
    readonly values: T[];

    /**
     * @param type the element resource type
     * @param obj the object used to assign the properties
     */
    constructor(private readonly type: Type<T>, obj: Object) {
        super(obj);

        for (const rel in this._embedded) {
            const values = this._embedded[rel];

            if (Array.isArray(values)) {
                this.values = this.arrayOf(type, values);

                return;
            }
        }

        this.values = [];
    }

    /**
     * Refresh the resource collection. In other words, read
     * the resource collection identified by `self` link.
     *
     * @returns an observable of the refreshed resource collection instance
     */
    override read(): Observable<this> {
        return this._client.get(this.self).pipe(
            map(obj => new Collection(this.type, {
                ...obj,
                 _client: this._client
            }) as this),
            catchError(this.handleError)
        );
    }
}
