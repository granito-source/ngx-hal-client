import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Resource } from './resource';

export class Collection<T extends Resource> extends Resource {
    readonly values: T[];

    constructor(private readonly type: Type<T>, obj: Object) {
        super(obj);

        for (const rel in this._embedded) {
            const values = this._embedded[rel];

            if (Array.isArray(values)) {
                this.values = this.arrayOf(type, values);

                return;
            }
        }

        this.values = [];
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
