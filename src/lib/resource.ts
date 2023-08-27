import { Observable, throwError } from "rxjs";
import { HalError } from "./hal-error";
import { ResourceService } from "./resource.service";

interface Link {
    href: string;
}

export class Resource {
    private readonly _links: { [rel: string]: Link} = {};

    private readonly resourceService!: ResourceService;

    constructor(obj: any) {
        Object.assign(this, obj);
    }

    read<T extends Resource>(type: new (obj: any) => T, rel: string): Observable<T> {
        try {
            return this.resourceService.get(type, this.href(rel));
        } catch (err) {
            return throwError(() => err);
        }
    }

    private href(rel: string): string {
        const link = this._links[rel];

        if (!link)
            throw new HalError({
                message: `relation '${rel}' is undefined`
            });

        if (!link.href)
            throw new HalError({
                message: `relation '${rel}' does not have href`
            });

        return link.href;
    }
}
