import { Observable, throwError } from 'rxjs';
import * as URI from 'uri-template';
import { HalError } from './hal-error';
import { ResourceService } from './resource.service';

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

    read<T extends Resource>(type: new (obj: Object) => T, rel: string,
        params: { [key: string]: string } = {}): Observable<T> {
        try {
            return this._service.get(type, this.href(rel, params));
        } catch (err) {
            return throwError(() => err);
        }
    }

    update(): Observable<void> {
        try {
            return this._service.put(this.href('self'), this);
        } catch (err) {
            return throwError(() => err);
        }
    }

    private href(rel: string,
        params: { [key: string]: string } = {}): string {
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
