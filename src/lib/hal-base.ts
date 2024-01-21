import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Type } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Accessor, HalError, objectFrom } from './internal';

const self = 'self';

interface Link {
    href: string;

    templated?: boolean;

    methods?: string[];
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
     * This property is `true` when either `methods` array does not exist
     * in the `self` link or the array exists and contains `POST` string.
     * It is `false` otherwise.
     */
    get canCreate(): boolean {
        return this.can('POST');
    }

    /**
     * This property is `true` when either `methods` array does not exist
     * in the `self` link or the array exists and contains `GET` string.
     * It is `false` otherwise.
     */
    get canRead(): boolean {
        return this.can('GET');
    }

    /**
     * This property is `true` when either `methods` array does not exist
     * in the `self` link or the array exists and contains `DELETE`
     * string. It is `false` otherwise.
     */
    get canDelete(): boolean {
        return this.can('DELETE');
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
     * observable for the call. The observable normally emits an accessor
     * for the newly created resource or `undefined` if `Location` header
     * was not returned by the call.
     *
     * @param obj the payload for the `POST` method call
     * @returns an observable of the resource's accessor
     */
    create(obj: any): Observable<Accessor | undefined> {
        return this.withSelf(
            self => this._client.post(self, objectFrom(obj), {
                observe: 'response'
            }).pipe(
                map(response => response.headers.get('Location') || undefined),
                map(location => !location ? undefined : this.accessor(location)),
                catchError(this.handleError)
            )
        );
    }

    /**
     * Delete the resource identified by `self` link.
     *
     * @returns an observable that emits next signal on successful delete
     */
    delete(): Observable<void> {
        return this.withSelf(
            self => this._client.delete(self).pipe(
                map(() => undefined),
                catchError(this.handleError)
            )
        );
    }

    protected withSelf<T>(func: (uri: string) => Observable<T>): Observable<T> {
        const self = this.self;

        if (!self)
            return throwError(() => new HalError({
                message: 'no valid "self" relation'
            }));

        return func(self);
    }

    protected accessor(href: string, methods?: string[]): Accessor {
        return this.instanceOf(Accessor, {
            _links: {
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

    protected can(method: string): boolean {
        const methods = this._links[self]?.methods;

        if (!Array.isArray(methods))
            return true;

        return !!methods.find(m => typeof m === 'string' &&
            m.toUpperCase() === method);
    }
}
