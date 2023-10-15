import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Type } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Accessor } from './accessor';
import { Collection } from './collection';
import { HalError } from './hal-error';

const self = 'self';

interface Link {
    href: string;

    templated?: boolean;
}

export abstract class HalBase {
    protected readonly _client!: HttpClient;

    protected readonly _links: Record<string, Link> = {};

    protected readonly _embedded: Record<string, Object> = {};

    get self(): string {
        return this._links[self]?.href;
    }

    constructor(obj: Object) {
        Object.assign(this, obj);
    }

    create(obj: any): Observable<Accessor | undefined> {
        return this._client.post(this.self, this.sanitize(obj), {
            observe: 'response'
        }).pipe(
            map(response => response.headers.get('Location') || undefined),
            map(location => !location ? undefined : this.accessor(location)),
            catchError(this.handleError)
        );
    }

    delete(): Observable<void> {
        return this._client.delete(this.self).pipe(
            map(() => undefined),
            catchError(this.handleError)
        );
    }

    protected accessor(href: string): Accessor {
        return this.instanceOf(Accessor, { _links: { self: { href } } });
    }

    protected instanceOf<T>(type: Type<T>, obj: Object): T {
        return new type({ ...obj, _client: this._client });
    }

    protected sanitize(body: any): any {
        if (typeof body !== 'object' || body === null)
            return body;

        if (body instanceof Collection)
            return this.sanitize(body.rawValues);

        if (Array.isArray(body))
            return body.map(x => this.sanitize(x));

        const { _client, _links, _embedded, ...sanitized } = body;

        return sanitized;
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
}
