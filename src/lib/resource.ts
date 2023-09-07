import { Observable, throwError } from 'rxjs';
import * as URI from 'uri-template';
import { HalError } from './hal-error';
import { ResourceService } from './resource.service';

interface Params {
    [key: string]: string | number | boolean;
}

interface Link {
    templated?: boolean;

    href: string;
}

export class Resource {
    private readonly _links: { [rel: string]: Link} = {};

    private readonly _service!: ResourceService;

    constructor(obj: Object) {
        Object.assign(this, obj);
    }

    create(obj: Object, rel: string, params: Params = {}):
        Observable<string | undefined> {
        return this.request(
            () => this._service.post(this.href(rel, params), obj));
    }

    read<T extends Resource>(type: new (obj: Object) => T, rel: string,
        params: Params = {}): Observable<T> {
        return this.request(
            () => this._service.get(type, this.href(rel, params)));
    }

    update(): Observable<void> {
        return this.request(
            () => this._service.put(this.href('self'), this));
    }

    private request<T>(func: () => Observable<T>): Observable<T> {
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
