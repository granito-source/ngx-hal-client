import { createHttpFactory, createSpyObject, HttpMethod,
    SpectatorHttp } from '@ngneat/spectator/vitest';
import { Accessor, Collection, HAL_ROOT, HalError, provideHalRoot,
    Resource } from './internal';
import { EnvironmentProviders, FactoryProvider, Injectable,
    Provider } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable()
class TestService {
}

class TestResource extends Resource {
    declare version: string;
}

describe('Accessor', () => {
    const createService = createHttpFactory({ service: TestService });
    let spectator: SpectatorHttp<TestService>;
    let accessor: Accessor;
    let noSelf: Accessor;
    let noHref: Accessor;

    beforeEach(() => {
        spectator = createService();
        accessor = new Accessor({
            _client: spectator.httpClient,
            _links: {
                self: { href: '/api/root' }
            }
        });
        noSelf = new Accessor({
            _client: spectator.httpClient,
            _links: {}
        });
        noHref = new Accessor({
            _client: spectator.httpClient,
            _links: {
                self: {}
            }
        });
    });

    it('exposes self link', () => {
        expect(accessor.self).toBe('/api/root');
    });

    describe('#canCreate', () => {
        it('is false when no self link', () => {
            const noSelf = new Accessor({
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canCreate).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(accessor.canCreate).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: 'GET'
                    }
                }
            });

            expect(notArray.canCreate).toBe(true);
        });

        it('is false when no POST in methods array', () => {
            const noPost = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET']
                    }
                }
            });

            expect(noPost.canCreate).toBe(false);
        });

        it('is true when POST is in methods array', () => {
            const withPost = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET', 'POST', 'PUT']
                    }
                }
            });

            expect(withPost.canCreate).toBe(true);
        });

        it('is true when POST matches case insensitively', () => {
            const withPost = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'PoSt']
                    }
                }
            });

            expect(withPost.canCreate).toBe(true);
        });
    });

    describe('#create()', () => {
        const item = new TestResource({ version: '3.5.7' });

        it('posts payload to self and emits Accessor when location is given', () => {
            let next!: Accessor;
            let complete = false;

            accessor.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/root/42'
                }
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/root/42');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of resources', () => {
            let next!: Accessor;
            let complete = false;

            accessor.create([item, item]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/root'
                }
            });

            expect(req.request.body).toEqual([
                { version: '3.5.7' },
                { version: '3.5.7' }
            ]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/root');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of primitives', () => {
            let next!: Accessor;
            let complete = false;

            accessor.create([0, 'zero', false, null, undefined]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/root'
                }
            });

            expect(req.request.body)
                .toEqual([0, 'zero', false, null, undefined]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/root');
            expect(complete).toBe(true);
        });

        it('posts raw values array when payload is collection', () => {
            const collection = new Collection(TestResource, {
                _embedded: {
                    collection: [
                        { version: '3.5.7' },
                        { version: '3.5.8' }
                    ]
                }
            });
            let next!: Accessor;
            let complete = false;

            accessor.create(collection).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/root'
                }
            });

            expect(req.request.body).toEqual([
                { version: '3.5.7' },
                { version: '3.5.8' }
            ]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/root');
            expect(complete).toBe(true);
        });

        it('posts payload to self and emits undefined self when no location', () => {
            const item = new TestResource({ version: '3.5.7' });
            let next!: Accessor;
            let complete = false;

            accessor.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created'
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next).toBeDefined();
            expect(next.self).toBeUndefined();
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "POST" method');
        });

        it('throws HAL error when self rel does have href', () => {
            let error!: HalError;

            noHref.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "POST" method');
        });

        it('throws HAL error when POST is not allowed', () => {
            const noPost = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['DELETE']
                    }
                }
            });
            let error!: HalError;

            noPost.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "POST" method');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/root/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            accessor.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#canRead', () => {
        it('is false when no self link', () => {
            const noSelf = new Accessor({
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canRead).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(accessor.canRead).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: 'POST'
                    }
                }
            });

            expect(notArray.canRead).toBe(true);
        });

        it('is false when no GET in methods array', () => {
            const noGet = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['POST']
                    }
                }
            });

            expect(noGet.canRead).toBe(false);
        });

        it('is true when GET is in methods array', () => {
            const withGet = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['PUT', 'GET', 'DELETE']
                    }
                }
            });

            expect(withGet.canRead).toBe(true);
        });

        it('is true when GET matches case insensitively', () => {
            const withGet = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'GeT']
                    }
                }
            });

            expect(withGet.canRead).toBe(true);
        });
    });

    describe('#read()', () => {
        it('emits resource at self link', () => {
            let next!: TestResource;
            let complete = false;

            accessor.read(TestResource).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.flush({ version: '2.7.1' });

            expect(next).toBeInstanceOf(TestResource);
            expect(next.version).toBe('2.7.1');
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.read(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.read(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when GET is not allowed', () => {
            const noGet = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['POST']
                    }
                }
            });
            let error!: HalError;

            noGet.read(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.read(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/root/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            accessor.read(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#readCollection()', () => {
        it('emits collection at self link', () => {
            let next!: Collection<TestResource>;
            let complete = false;

            accessor.readCollection(TestResource).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.flush({
                _embedded: {
                    versions: [
                        {
                            version: '1.0.0'
                        },
                        {
                            version: '2.0.0'
                        }
                    ]
                }
            });

            expect(next).toBeInstanceOf(Collection);
            expect(next.values.map(x => x.version)).toEqual([
                '1.0.0',
                '2.0.0'
            ]);
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.readCollection(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.readCollection(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when GET is not allowed', () => {
            const noGet = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['POST']
                    }
                }
            });
            let error!: HalError;

            noGet.readCollection(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "GET" method');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.readCollection(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/root/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            accessor.readCollection(TestResource).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#canDelete', () => {
        it('is false when no self link', () => {
            const noSelf = new Accessor({
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canDelete).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(accessor.canDelete).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: 'GET'
                    }
                }
            });

            expect(notArray.canDelete).toBe(true);
        });

        it('is false when no DELETE in methods array', () => {
            const noDelete = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET']
                    }
                }
            });

            expect(noDelete.canDelete).toBe(false);
        });

        it('is true when DELETE is in methods array', () => {
            const withDelete = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET', 'DELETE', 'PUT']
                    }
                }
            });

            expect(withDelete.canDelete).toBe(true);
        });

        it('is true when DELETE matches case insensitively', () => {
            const withDelete = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'DeLeTe']
                    }
                }
            });

            expect(withDelete.canDelete).toBe(true);
        });
    });

    describe('#delete()', () => {
        it('deletes resource at self link', () => {
            let next = false;
            let complete = false;

            accessor.delete().subscribe({
                next: () => next = true,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/root', HttpMethod.DELETE);

            req.flush(null, {
                status: 204,
                statusText: 'No Content'
            });

            expect(next).toBe(true);
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "DELETE" method');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "DELETE" method');
        });

        it('throws HAL error when DELETE is not allowed', () => {
            const noDelete = new Accessor({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['PUT']
                    }
                }
            });
            let error!: HalError;

            noDelete.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toBe('no "self" relation supporting "DELETE" method');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.DELETE);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/root/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            accessor.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/root', HttpMethod.DELETE);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/root');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });
});

describe('provideHalRoot()', () => {
    it('returns factory provider for HAL_ROOT', () => {
        const providers = unwrap(provideHalRoot('/api/root'));

        expect(providers).toHaveLength(1);

        const provider = providers[0] as FactoryProvider;

        expect(provider.provide).toBe(HAL_ROOT);
        expect(provider.deps).toEqual([HttpClient]);
        expect(provider.useFactory).toBeInstanceOf(Function);

        const root = provider.useFactory(createSpyObject(HttpClient));

        expect(root).toBeInstanceOf(Accessor);
        expect(root.self).toBe('/api/root');
    });
});

function unwrap(providers: EnvironmentProviders): Provider[] {
    // noinspection JSNonASCIINames,NonAsciiCharacters
    return (providers as unknown as {
        // noinspection JSNonASCIINames,NonAsciiCharacters
        ɵproviders: Provider[]
    }).ɵproviders;
}
