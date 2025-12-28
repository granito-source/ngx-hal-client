import { Type } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import * as URI from 'uri-template';
import { Accessor, HalBase, objectFrom } from './internal';

/**
 * This type represent parameters for templated links.
 */
export type Params = Record<string, string | number | boolean>;

/**
 * This class represents an in-memory instance of a HAL resource.
 */
export class Resource extends HalBase {
    /**
     * This property is `true` when the `self` link exists and either
     * `methods` array does not exist in the `self` link or the array
     * exists and contains `PUT` string. It is `false` otherwise.
     */
    get canUpdate(): boolean {
        return !!this.uriFor('PUT');
    }

    /**
     * Follow the relation link. Returns an accessor for the resource.
     * The `self` link in the accessor is set to `undefined` if no such
     * relation exists.
     *
     * @param rel the name of the relation link
     * @param params parameters for a templated link
     * @returns an accessor for the linked resource
     */
    follow(rel: string, params: Params = {}): Accessor {
        const link = this._links[rel];

        if (!link)
            return this.accessor();

        const uri = link.href;

        return this.accessor(!link.templated ? uri :
            URI.parse(uri).expand(params), link.methods);
    }

    /**
     * Refresh the resource. In other words, read the resource
     * identified by `self` link.
     *
     * @returns an observable of the refreshed resource instance
     */
    read(): Observable<this> {
        const type = this.constructor as Type<this>;

        return this.withUriFor('GET', uri => this._client.get(uri).pipe(
            map(obj => this.roInstanceOf(type, obj)),
            catchError(this.handleError)
        ));
    }

    /**
     * Persist the resource. Uses `PUT` request to send the new resource
     * state.
     *
     * @returns an observable of the resource instance
     */
    update(): Observable<this> {
        return this.withUriFor('PUT', uri => this._client.put(uri, objectFrom(this)).pipe(
            map(() => this),
            catchError(this.handleError)
        ));
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

            return first && this.roInstanceOf(type, first);
        }

        return obj && this.roInstanceOf(type, obj);
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

        return Array.isArray(obj) ? this.roArrayOf(type, obj) :
            obj && this.roArrayOf(type, [obj]);

    }

    /**
     * Clones the resource instance and allows to modify the clone's
     * properties using the provided function.
     *
     * @param update the update function to apply to the clone
     * @returns the updated clone of the resource
     */
    mutate(update: (x: this) => void): this {
        const type = this.constructor as Type<this>;
        const mutable = new type(this);

        update(mutable);

        return Object.freeze(mutable);
    }

    protected roArrayOf<T extends Resource>(type: Type<T>,
        values: Object[]): T[] {
        return values.map(obj => this.roInstanceOf(type, obj));
    }
}
