import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Type } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Accessor, HalError, objectFrom } from './internal';

const self = 'self';

interface Link {
    readonly href: string;

    readonly templated?: boolean;

    readonly methods?: string[];
}

/**
 * The common base for resource and accessor.
 */
export abstract class HalBase {
    protected readonly _client!: HttpClient;

    protected readonly _links: Readonly<Record<string, Link>> = {};

    protected readonly _embedded: Readonly<Record<string, Object>> = {};

    /**
     * The URI of `self` link.
     */
    get self(): string {
        return this._links[self]?.href;
    }

    /**
     * This property is `true` when the `self` link exists and either
     * `methods` array does not exist in the `self` link or the array
     * exists and contains `POST` string. It is `false` otherwise.
     */
    get canCreate(): boolean {
        return !!this.uriFor('POST');
    }

    /**
     * This property is `true` when the `self` link exists and either
     * `methods` array does not exist in the `self` link or the array
     * exists and contains `GET` string. It is `false` otherwise.
     */
    get canRead(): boolean {
        return !!this.uriFor('GET');
    }

    /**
     * This property is `true` when the `self` link exists and either
     * `methods` array does not exist in the `self` link or the array
     * exists and contains `DELETE` string. It is `false` otherwise.
     */
    get canDelete(): boolean {
        return !!this.uriFor('DELETE');
    }

    /**
     * @param obj the object used to assign the properties
     */
    constructor(obj: Object) {
        Object.assign(this, obj);
    }

    /**
     * Create a new resource in the collection identified by `self` link.
     * It makes a `POST` call to the URI in `self` link and returns an
     * observable for the call. The observable emits an accessor for
     * the newly created resource. The `self` link in the accessor
     * may be set to `undefined` if `Location` header is not returned by
     * the call.
     *
     * @param obj the payload for the `POST` method call
     * @returns an observable of the resource's accessor
     */
    create(obj: any): Observable<Accessor> {
        return this.withUriFor('POST',
            uri => this._client.post(uri, objectFrom(obj), {
                observe: 'response'
            }).pipe(
                map(response => response.headers.get('Location') || undefined),
                map(location => this.accessor(location)),
                catchError(this.handleError)
            ));
    }

    /**
     * Delete the resource identified by `self` link.
     *
     * @returns an observable that emits next signal on successful delete
     */
    delete(): Observable<void> {
        return this.withUriFor('DELETE',
            uri => this._client.delete(uri).pipe(
                map(() => undefined),
                catchError(this.handleError)
            ));
    }

    protected withUriFor<T>(method: string,
        func: (x: string) => Observable<T>): Observable<T> {
        const uri = this.uriFor(method);

        if (!uri)
            return throwError(() => new HalError({
                message: `no "self" relation supporting "${method}" method`
            }));

        return func(uri);
    }

    protected accessor(href?: string, methods?: string[]): Accessor {
        return this.instanceOf(Accessor, {
            _links: !href ? {} : {
                self: {
                    href,
                    methods
                }
            }
        });
    }

    protected instanceOf<T>(type: Type<T>, obj: Object): T {
        return new type({ ...obj, _client: this._client });
    }

    protected roInstanceOf<T>(type: Type<T>, obj: Object): T {
        return Object.freeze(this.instanceOf(type, obj));
    }

    protected handleError(err: HttpErrorResponse): Observable<never> {
        if (err.error instanceof Event)
            return throwError(() => new HalError({
                message: err.message,
                path: err.url
            }));

        return throwError(() => new HalError({
            message: err.message,
            status: err.status,
            error: err.statusText,
            path: err.url,
            ...err.error
        }));
    }

    protected uriFor(method: string): string | undefined {
        const selfRel = this._links[self];

        if (!selfRel || !selfRel.href)
            return undefined;

        const methods = selfRel.methods;

        if (!Array.isArray(methods))
            return selfRel.href;

        return methods.find(m => typeof m === 'string' &&
            m.toUpperCase() === method) && selfRel.href || undefined;
    }
}
