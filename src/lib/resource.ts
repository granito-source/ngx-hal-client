import { Type } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import * as URI from 'uri-template';
import { HalError } from './hal-error';
import { ResourceService } from './resource.service';

type Params = Record<string, string | number | boolean>;

interface Link {
    templated?: boolean;

    href: string;
}

const self = 'self';

export class Resource {
    protected readonly _embedded: Record<string, Object> = {};

    private readonly _service!: ResourceService;

    private readonly _links: Record<string, Link> = {};

    constructor(obj: Object) {
        Object.assign(this, obj);
    }

    create(obj: Object, rel = self, params: Params = {}):
        Observable<string | undefined> {
        return this.do(() => this._service.post(this.href(rel, params), obj));
    }

    read<T extends Resource>(type: Type<T>, rel: string, params: Params = {}):
        Observable<T> {
        return this.do(() => this._service.get(type, this.href(rel, params)));
    }

    update(): Observable<void> {
        return this.do(() => this._service.put(this.href(self), this));
    }

    delete(rel = self, params: Params = {}): Observable<void> {
        return this.do(() => this._service.delete(this.href(rel, params)));
    }

    get<T extends Resource>(type: Type<T>, rel: string): T | undefined {
        const obj = this._embedded[rel];

        if (Array.isArray(obj)) {
            const objs = obj as Object[];
            const first = objs[0];

            return first && this._service.create(type, first);
        }

        return obj && this._service.create(type, obj);
    }

    getArray<T extends Resource>(type: Type<T>, rel: string): T[] | undefined {
        const obj = this._embedded[rel];

        if (Array.isArray(obj)) {
            const objs = obj as Object[];

            return objs.map(obj => this._service.create(type, obj));
        }

        return obj && [this._service.create(type, obj)];
    }

    private do<T>(func: () => Observable<T>): Observable<T> {
        try {
            return func();
        } catch (err) {
            return throwError(() => err);
        }
    }

    private href(rel: string, params: Params = {}): string {
        const link = this._links[rel];

        if (!link)
            throw new HalError({
                message: `relation '${rel}' is undefined`
            });

        if (!link.href)
            throw new HalError({
                message: `relation '${rel}' does not have href`
            });

        if (!link.templated)
            return link.href;

        return URI.parse(link.href).expand(params);
    }
}
