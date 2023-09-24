import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Type } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Collection } from './collection';
import { HalError } from './hal-error';
import { Resource } from './resource';

export abstract class ResourceService {
    abstract getResource<T extends Resource>(type: Type<T>, uri: string):
        Observable<T>;
}

@Injectable()
export class ResourceServiceImpl extends ResourceService {
    constructor(private readonly http: HttpClient) {
        super();
    }

    create<T extends Resource>(type: Type<T>, obj: Object): T {
        return new type({ ...obj, _service: this });
    }

    createCollection<T extends Resource>(type: Type<T>, obj: Object):
        Collection<T> {
        return new Collection(type, { ...obj, _service: this });
    }

    getResource<T extends Resource>(type: Type<T>, uri: string):
        Observable<T> {
        return this.get(uri).pipe(
            map(obj => this.create(type, obj))
        );
    }

    get(uri: string): Observable<Object> {
        return this.http.get(uri).pipe(
            catchError(this.handleError)
        );
    }

    post(uri: string, body: any): Observable<string | undefined> {
        return this.http.post(uri, this.sanitize(body), {
            observe: 'response'
        }).pipe(
            map(response => response.headers.get('Location') || undefined),
            catchError(this.handleError)
        );
    }

    put(uri: string, body: Object): Observable<void> {
        return this.http.put(uri, this.sanitize(body)).pipe(
            map(() => undefined),
            catchError(this.handleError)
        );
    }

    delete(uri: string): Observable<void> {
        return this.http.delete(uri).pipe(
            map(() => undefined),
            catchError(this.handleError)
        );
    }

    private sanitize(body: any): any {
        if (typeof body !== 'object' || body === null)
            return body;

        if (Array.isArray(body))
            return body.map(x => this.sanitize(x));

        const { _service, _links, _embedded, ...sanitized } = body;

        return sanitized;
    }

    private handleError(err: HttpErrorResponse): Observable<never> {
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
