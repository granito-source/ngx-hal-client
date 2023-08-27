import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { HalError } from './hal-error';
import { Resource } from './resource';

@Injectable({ providedIn: 'root' })
export class ResourceService {
    constructor(private http: HttpClient) {
    }

    create<T extends Resource>(type: new (obj: any) => T, obj: any): T {
        return new type({ ...obj, resourceService: this });
    }

    get<T extends Resource>(type: new (obj: any) => T, uri: string): Observable<T> {
        return this.http.get(uri).pipe(
            map(obj => this.create(type, obj)),
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
            status: err.status,
            error: err.statusText,
            path: err.url,
            ...err.error
        }));
    }
}
