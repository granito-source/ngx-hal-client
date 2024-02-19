import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Accessor } from './internal';

/**
 * This service is used to obtain API root accessors. It incapsulates
 * {@link HttpClient}, which will be passed to all {@link Accessor}
 * objects originating from this service, directly or indirectly.
 */
@Injectable({ providedIn: 'root' })
export class HalClientService {
    /**
     * @param httpClient Angular HTTP client
     */
    constructor(private readonly httpClient: HttpClient) {
    }

    /**
     * Obtain an accessor for the API root entry point specified by the
     * URI.
     *
     * @param uri the URI for the API root
     * @returns an accessor for the API root
     */
    root(uri: string): Accessor {
        return new Accessor({
            _client: this.httpClient,
            _links: {
                self: { href: uri }
            }
        });
    }
}
