import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { Resource } from './resource';

export class Collection<T extends Resource> extends Resource {
    readonly data: T[];

    constructor(private type: Type<T>, obj: Object) {
        super(obj);

        for (const rel in this._embedded) {
            const value = this._embedded[rel];

            if (Array.isArray(value)) {
                this.data = value.map(obj => this._service.create(type, obj));

                return;
            }
        }

        this.data = [];
    }

    override refresh(): Observable<this> {
        return this.readCollection(this.type, 'self') as Observable<this>;
    }
}
