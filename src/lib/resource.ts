import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import * as URI from 'uri-template';
import { Accessor } from './accessor';
import { HalBase } from './hal-base';

/**
 * This type represent parameters for templated links.
 */
export type Params = Record<string, string | number | boolean>;

/**
 * This class repesents an in-memory instance of a HAL resource.
 */
export class Resource extends HalBase {
    get canUpdate(): boolean {
        return this.can('PUT');
    }

    /**
     * Follow the relation link. Returns an accessor for the resource
     * or `undefined` if no such relation exists.
     *
     * @param rel the name of the relation link
     * @param params parameters for a templated link
     * @returns an accessor for the linked resource or `undefined`
     */
    follow(rel: string, params: Params = {}): Accessor | undefined {
        const link = this._links[rel];

        if (!link)
            return undefined;

        const uri = link.href;

        return !uri ? undefined :
            this.accessor(!link.templated ? uri :
                URI.parse(uri).expand(params), link.methods);
    }

    /**
     * Refresh the the resource. In other words, read the resource
     * identified by `self` link.
     *
     * @returns an observable of the refreshed resource instance
     */
    read(): Observable<this> {
        const type = this.constructor as Type<this>;

        return this.withSelf(
            self => this._client.get(self).pipe(
                map(obj => this.instanceOf(type, obj)),
                catchError(this.handleError)
            )
        );
    }

    /**
     * Persit the resource. Uses `PUT` request to send the new resource
     * state.
     *
     * @returns an observable of resource accessor
     */
    update(): Observable<Accessor> {
        return this.withSelf(
            self => this._client.put(self, this.sanitize(this)).pipe(
                map(() => this.accessor(self)),
                catchError(this.handleError)
            )
        );
    }

    /**
     * Returns a single embedded resource or `undefined` if no such
     * embedded exists. If the named resource is an array it returns
     * the first element.
     *
     * @param type the resource type
     * @param rel the name of the embedded resource
     * @returns the resource or `undefined`
     */
    get<T extends Resource>(type: Type<T>, rel: string): T | undefined {
        const obj = this._embedded[rel];

        if (Array.isArray(obj)) {
            const objs = obj as Object[];
            const first = objs[0];

            return first && this.instanceOf(type, first);
        }

        return obj && this.instanceOf(type, obj);
    }

    /**
     * Returns an embedded array of resources or `undefined` if the named
     * embedded does not exist. If the named resource is not an array it
     * wraps the resource in an array.
     *
     * @param type the element resource type
     * @param rel the name of the embedded resource array
     * @returns the resource array or `undefined`
     */
    getArray<T extends Resource>(type: Type<T>, rel: string):
        T[] | undefined {
        const obj = this._embedded[rel];

        if (Array.isArray(obj))
            return this.arrayOf(type, obj);

        return obj && [this.instanceOf(type, obj)];
    }

    protected arrayOf<T extends Resource>(type: Type<T>,
        values: Object[]): T[] {
        return values.map(obj => this.instanceOf(type, obj));
    }
}
