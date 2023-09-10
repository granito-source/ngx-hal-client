import { Type } from '@angular/core';
import { Resource } from './resource';

export class Collection<T extends Resource> extends Resource implements ArrayLike<T> {
    readonly [key: number]: T;

    readonly length: number = 0;

    constructor(type: Type<T>, obj: Object) {
        super(obj);

        for (const rel in this._embedded) {
            const value = this._embedded[rel];

            if (Array.isArray(value)) {
                Object.assign(this,
                    value.map(obj => this._service.create(type, obj)));
                this.length = value.length;

                return;
            }
        }
    }
}
