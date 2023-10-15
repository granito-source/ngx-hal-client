import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Accessor } from './accessor';

@Injectable()
export class HalClientService {
    constructor(private readonly http: HttpClient) {
    }

    root(uri: string): Accessor {
        return new Accessor({
            _client: this.http,
            _links: {
                self: { href: uri }
            }
        });
    }
}
