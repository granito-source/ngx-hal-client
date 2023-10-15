import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Resource } from './resource';

export class Collection<T extends Resource> extends Resource {
    get rawValues(): Object[] {
        for (const rel in this._embedded) {
            const values = this._embedded[rel];

            if (Array.isArray(values))
                return values;
        }

        return [];
    }

    get values(): T[] {
        return this.arrayOf(this.type, this.rawValues);
    }

    constructor(private readonly type: Type<T>, obj: Object) {
        super(obj);
    }

    override read(): Observable<this> {
        return this._client.get(this.self).pipe(
            map(obj => new Collection(this.type, {
                ...obj,
                 _client: this._client
            }) as this),
            catchError(this.handleError)
        );
    }
}
