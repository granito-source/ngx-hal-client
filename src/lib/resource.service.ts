import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { HalError } from './hal-error';
import { Resource } from './resource';

@Injectable({ providedIn: 'root' })
export class ResourceService {
    constructor(private http: HttpClient) {
    }

    get<T extends Resource>(type: new (obj: any) => T, uri: string): Observable<T> {
        return this.http.get(uri).pipe(
            map(obj => new type(obj)),
            catchError(err => this.handleError(err))
        );
    }

    private handleError(err: HttpErrorResponse): Observable<never> {
        if (err.error instanceof Event)
            return throwError(() => new HalError({
                message: err.message,
                path: err.url
            }));

        return throwError(() => new HalError({
            message: err.message,
            path: err.url,
            ...err.error,
            httpStatus: err.status
        }));
    }
}
