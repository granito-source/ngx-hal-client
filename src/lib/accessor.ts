import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders,
    Type } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { Collection, HalBase, Resource } from './internal';
import { HttpClient } from "@angular/common/http";

/**
 * This class provides a way to execute operations on HAL resources
 * without reading them first. Accessors are obtained either by following
 * resource links or by getting the root entry point for the API.
 */
export class Accessor extends HalBase {
    /**
     * Read the resource identified by `self` link.
     *
     * @param type the resource type
     * @returns an observable of the resource instance
     */
    read<T extends Resource>(type: Type<T>): Observable<T> {
        return this._client.get(this.self).pipe(
            map(obj => this.instanceOf(type, obj)),
            catchError(this.handleError)
        );
    }

    /**
     * Read the resource collection identified by `self` link.
     *
     * @param type the collection element type
     * @returns an observable of the collection instance
     */
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

/**
 * The injection token for HAL root URL.
 */
export const HAL_ROOT = new InjectionToken<Accessor>('hal.root');

/**
 * Configure HAL client using the provided the root URL for the API.
 *
 * @param url the root URL
 * @return an array of environment providers with a single factory
 * provider for the {@link Accessor} for the API root
 */
export function provideHalRoot(url: string): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: HAL_ROOT,
            deps: [HttpClient],
            useFactory: (httpClient: HttpClient) => new Accessor({
                _client: httpClient,
                _links: {
                    self: { href: url }
                }
            })
        }
    ]);
}
