import { Type } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import * as URI from 'uri-template';
import { Accessor } from './accessor';
import { HalBase } from './hal-base';
import { HalError } from './hal-error';

type Params = Record<string, string | number | boolean>;

export class Resource extends HalBase {
    follow(rel: string, params: Params = {}): Accessor | undefined {
        const link = this._links[rel];

        if (!link)
            return undefined;

        const uri = link.href;

        return !uri ? undefined :
            this.accessor(!link.templated ? uri :
                URI.parse(uri).expand(params));
    }

    read(): Observable<this> {
        const type = this.constructor as Type<this>;

        return this._client.get(this.self).pipe(
            map(obj => this.instanceOf(type, obj)),
            catchError(this.handleError)
        );
    }

    update(): Observable<Accessor> {
        const uri = this.self;

        if (!uri)
            return throwError(() => new HalError({
                message: 'no valid "self" relation'
            }));

        return this._client.put(uri, this.sanitize(this)).pipe(
            map(() => this.accessor(uri)),
            catchError(this.handleError)
        );
    }

    get<T extends Resource>(type: Type<T>, rel: string): T | undefined {
        const obj = this._embedded[rel];

        if (Array.isArray(obj)) {
            const objs = obj as Object[];
            const first = objs[0];

            return first && this.instanceOf(type, first);
        }

        return obj && this.instanceOf(type, obj);
    }

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
