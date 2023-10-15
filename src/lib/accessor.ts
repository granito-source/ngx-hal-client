import { Type } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { Collection } from './collection';
import { HalBase } from './hal-base';
import { Resource } from './resource';

export class Accessor extends HalBase {
    read<T extends Resource>(type: Type<T>): Observable<T> {
        return this._client.get(this.self).pipe(
            map(obj => this.instanceOf(type, obj)),
            catchError(this.handleError)
        );
    }

    readCollection<T extends Resource>(type: Type<T>):
        Observable<Collection<T>> {
        return this._client.get(this.self).pipe(
            map(obj => new Collection(type, {
                ...obj,
                 _client: this._client
            })),
            catchError(this.handleError)
        );
    }
}
