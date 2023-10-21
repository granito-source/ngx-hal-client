import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Collection } from './collection';
import { HalBase } from './hal-base';
import { Resource } from './resource';

/**
 * This class provides a way to execute operations on HAL resources
 * without reading them first. Accessors are obtained either by following
 * resource links or by getting the root entry point for the API.
 */
export class Accessor extends HalBase {
    /**
     * Read the resource identified by `self` link.
     *
     * @param type the resource type
     * @returns an observable of the resource instance
     */
    read<T extends Resource>(type: Type<T>): Observable<T> {
        return this._client.get(this.self).pipe(
            map(obj => this.instanceOf(type, obj)),
            catchError(this.handleError)
        );
    }

    /**
     * Read the resource collection identified by `self` link.
     *
     * @param type the collection element type
     * @returns an observable of the collection instance
     */
    readCollection<T extends Resource>(type: Type<T>):
        Observable<Collection<T>> {
        return this._client.get(this.self).pipe(
            map(obj => new Collection(type, {
                ...obj,
                 _client: this._client
            })),
            catchError(this.handleError)
        );
    }
}
