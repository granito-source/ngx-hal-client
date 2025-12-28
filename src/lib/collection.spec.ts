import { createHttpFactory, HttpMethod,
    SpectatorHttp } from '@ngneat/spectator/vitest';
import { Accessor, Collection, HalError, Resource } from './internal';
import { Injectable } from "@angular/core";

@Injectable()
class TestService {
}

class TestResource extends Resource {
    declare version: string;
}

describe('Collection', () => {
    const createService = createHttpFactory({ service: TestService });
    let spectator: SpectatorHttp<TestService>;
    let collection: Collection<TestResource>;
    let noSelf: Collection<TestResource>;
    let noHref: Collection<TestResource>;
    let paged: Collection<TestResource>;

    beforeEach(() => {
        spectator = createService();
        collection = new Collection(TestResource, {
            _client: spectator.httpClient,
            _links: {
                self: { href: '/api/test' },
                find: {
                    href: '/api/search{?q}',
                    methods: ['GET'],
                    templated: true
                },
                notmpl: {
                    href: '/api/search{?q}'
                }
            },
            _embedded: {
                primitive: 42,
                object: {
                    version: '1.0.0'
                },
                array: [
                    { version: '2.0.0' },
                    { version: '3.0.0' }
                ],
                empty: []
            }
        });
        noSelf = new Collection(TestResource, {
            _client: spectator.httpClient,
            _links: {},
            _embedded: {
                array: [
                    { version: '2.0.0' },
                    { version: '3.0.0' }
                ]
            }
        });
        noHref = new Collection(TestResource, {
            _client: spectator.httpClient,
            _links: {
                self: {}
            },
            _embedded: {
                array: [
                    { version: '2.0.0' },
                    { version: '3.0.0' }
                ]
            }
        });
        paged = new Collection(TestResource, {
            _client: spectator.httpClient,
            _links: {
                self: { href: '/api/test' },
                next: { href: '/api/test?start=44&limit=2' },
                prev: { href: '/api/test?start=40&limit=2' }
            },
            _embedded: {
                array: [
                    { version: '2.0.0' },
                    { version: '3.0.0' }
                ]
            },
            start: 42
        });
    });

    it('exposes self link', () => {
        expect(collection.self).toBe('/api/test');
    });

    describe('#start', () => {
        it('is 0 by default', () => {
            expect(collection.start).toBe(0);
        });

        it('is set by constructor if positive', () => {
            expect(paged.start).toBe(42);
        });

        it('is set to 0 if negative', () => {
            const negative = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/test' }
                },
                _embedded: {
                    values: []
                },
                start: -1
            });

            expect(negative.start).toBe(0);
        });

        it('is truncated if not whole number', () => {
            const fraction = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/test' }
                },
                _embedded: {
                    values: []
                },
                start: 42.9
            });

            expect(fraction.start).toBe(42);
        });
    });

    describe('#values', () => {
        it('uses first embedded array', () => {
            const values = collection.values;

            expect(values.length).toBe(2);
            expect(values[0]).toBeInstanceOf(TestResource);
            expect(values[0]).toHaveProperty('version', '2.0.0');
            expect(values[1]).toBeInstanceOf(TestResource);
            expect(values[1]).toHaveProperty('version', '3.0.0');
            expect(values[2]).toBeUndefined();
        });

        it('initializes as empty when no embedded arrays', () => {
            const empty = new Collection(TestResource, {
                _client: spectator.httpClient,
                _embedded: {
                    num: 42
                }
            }).values;

            expect(empty.length).toBe(0);
            expect(empty[0]).toBeUndefined();
        });
    });

    describe('#follow()', () => {
        it('sets self to undefined when rel does not exist', () => {
            expect(collection.follow('missing').self).toBeUndefined();
        });

        it('sets self to undefined when rel does not have href', () => {
            expect(noHref.follow('self').self).toBeUndefined();
        });

        it('returns accessor with self link when rel exists', () => {
            expect(collection.follow('find').self).toBe('/api/search');
        });

        it('expands parameters when link is templated', () => {
            expect(collection.follow('find', { q: 'test' }).self)
                .toBe('/api/search?q=test');
        });

        it('does not expand parameters when link is not templated', () => {
            expect(collection.follow('notmpl', { q: 'test' }).self)
                .toBe('/api/search{?q}');
        });

        it('preserves methods array when present', () => {
            const accessor = collection.follow('find');

            expect(accessor.canCreate).toBe(false);
            expect(accessor.canRead).toBe(true);
            expect(accessor.canDelete).toBe(false);
        });
    });

    describe('#next()', () => {
        it('returns accessor with self link when next rel exists', () => {
            expect(paged.next().self).toBe('/api/test?start=44&limit=2');
        });

        it('sets self to  undefined when next rel does not exist', () => {
            expect(collection.next().self).toBeUndefined();
        });

        it('sets self undefined when next rel does not have href', () => {
            const broken = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/test' },
                    next: {}
                },
                _embedded: {
                    array: []
                },
                start: 0
            });

            expect(broken.next().self).toBeUndefined();
        });
    });

    describe('#prev()', () => {
        it('returns accessor with self link when prev rel exists', () => {
            expect(paged.prev().self).toBe('/api/test?start=40&limit=2');
        });

        it('sets self to undefined when prev rel does not exist', () => {
            expect(collection.prev().self).toBeUndefined();
        });

        it('sets self to undefined when prev rel does not have href', () => {
            const broken = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/test' },
                    prev: {}
                },
                _embedded: {
                    array: []
                },
                start: 0
            });

            expect(broken.prev().self).toBeUndefined();
        });
    });

    describe('#canCreate', () => {
        it('is false when no self link', () => {
            const noSelf = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canCreate).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(collection.canCreate).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Collection(TestResource, {
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
            const noPost = new Collection(TestResource, {
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
            const withPost = new Collection(TestResource, {
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
            const withPost = new Collection(TestResource, {
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

        it('posts payload to self when it exists', () => {
            let next!: Accessor;
            let complete = false;

            collection.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/test/42'
                }
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/test/42');
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
            const noPost = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/test',
                        methods: ['DELETE']
                    }
                },
                _embedded: {
                    array: []
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

        it('posts array when payload is array of resources', () => {
            let next!: Accessor;
            let complete = false;

            collection.create([item, item]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/test'
                }
            });

            expect(req.request.body).toEqual([
                { version: '3.5.7' },
                { version: '3.5.7' }
            ]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of primitives', () => {
            let next!: Accessor;
            let complete = false;

            collection.create([0, 'zero', false, null, undefined]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/test'
                }
            });

            expect(req.request.body)
                .toEqual([0, 'zero', false, null, undefined]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('posts sanitized values array when payload is collection', () => {
            const newCollection = new Collection(TestResource, {
                _embedded: {
                    collection: [
                        { version: '3.5.7' },
                        { version: '3.5.8' }
                    ]
                }
            });
            let next!: Accessor;
            let complete = false;

            collection.create(newCollection).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/test'
                }
            });

            expect(req.request.body).toEqual([
                { version: '3.5.7' },
                { version: '3.5.8' }
            ]);
            expect(next).toBeDefined();
            expect(next.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('emits undefined self when no location', () => {
            const item = new TestResource({ version: '3.5.7' });
            let next!: Accessor;
            let complete = false;

            collection.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created'
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next).toBeDefined();
            expect(next.self).toBeUndefined();
            expect(complete).toBe(true);
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            collection.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/test/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            collection.create(item).subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#canRead', () => {
        it('is false when no self link', () => {
            const noSelf = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canRead).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(collection.canRead).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Collection(TestResource, {
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
            const noGet = new Collection(TestResource, {
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
            const withGet = new Collection(TestResource, {
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
            const withGet = new Collection(TestResource, {
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
        it('emits collection at self link when it exists', () => {
            let next!: Collection<TestResource>;
            let complete = false;

            collection.read().subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.GET);

            req.flush({
                _embedded: {
                    array: [
                        { version: '2.0.1' },
                        { version: '3.0.0' }
                    ]
                }
            });

            expect(next).toBeInstanceOf(Collection);
            expect(next.values.map(x => x.version)).toEqual([
                '2.0.1',
                '3.0.0'
            ]);
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.read().subscribe({
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

            noHref.read().subscribe({
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
            const noGet = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/test',
                        methods: ['POST']
                    }
                },
                _embedded: {
                    array: []
                }
            });
            let error!: HalError;

            noGet.read().subscribe({
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

            collection.read().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.GET);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/test/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            collection.read().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.GET);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#canUpdate', () => {
        it('is false when no self link', () => {
            const noSelf = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canUpdate).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(collection.canUpdate).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: 'PUT'
                    }
                }
            });

            expect(notArray.canUpdate).toBe(true);
        });

        it('is false when no PUT in methods array', () => {
            const noPut = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET']
                    }
                }
            });

            expect(noPut.canUpdate).toBe(false);
        });

        it('is true when PUT is in methods array', () => {
            const withPut = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET', 'PUT', 'DELETE']
                    }
                }
            });

            expect(withPut.canUpdate).toBe(true);
        });

        it('is true when PUT matches case insensitively', () => {
            const withPut = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'pUt']
                    }
                }
            });

            expect(withPut.canUpdate).toBe(true);
        });
    });

    describe('#update()', () => {
        it('puts payload to self when it exists', () => {
            let next!: Collection<TestResource>;
            let complete = false;

            collection.update().subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.PUT);

            req.flush(null, {
                status: 204,
                statusText: 'No Content'
            });

            expect(req.request.body).toEqual([
                { version: '2.0.0' },
                { version: '3.0.0' }
            ]);
            expect(next).toBe(collection);
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.update().subscribe({
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
                .toBe('no "self" relation supporting "PUT" method');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.update().subscribe({
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
                .toBe('no "self" relation supporting "PUT" method');
        });

        it('throws HAL error when PUT is not allowed', () => {
            const noPut = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/test',
                        methods: ['GET']
                    }
                },
                _embedded: {
                    array: []
                }
            });
            let error!: HalError;

            noPut.update().subscribe({
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
                .toBe('no "self" relation supporting "PUT" method');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            collection.update().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.PUT);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/test/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            collection.update().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.PUT);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#canDelete', () => {
        it('is false when no self link', () => {
            const noSelf = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {}
            });

            expect(noSelf.canDelete).toBe(false);
        });

        it('is true when no methods array', () => {
            expect(collection.canDelete).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Collection(TestResource, {
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
            const noDelete = new Collection(TestResource, {
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
            const withDelete = new Collection(TestResource, {
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
            const withDelete = new Collection(TestResource, {
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
        it('deletes resource at self link when it exists', () => {
            let next = false;
            let complete = false;

            collection.delete().subscribe({
                next: () => next = true,
                complete: () => complete = true,
                error: () => expect.fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.DELETE);

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

        it('throws HAL error when self rel does not have href', () => {
            const noDelete = new Collection(TestResource, {
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/test',
                        methods: ['PUT']
                    }
                },
                _embedded: {
                    array: []
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

            collection.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.DELETE);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/test/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            collection.delete().subscribe({
                next: () => expect.fail('no next is expected'),
                complete: () => expect.fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/test', HttpMethod.DELETE);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/test');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('#get()', () => {
        it('returns undefined when embedded rel does not exist', () => {
            expect(collection.get(TestResource, 'missing')).toBeUndefined();
        });

        it('returns resource when embedded rel exists', () => {
            const test = collection.get(TestResource, 'object');

            expect(test).toBeInstanceOf(TestResource);
            expect(test?.version).toBe('1.0.0');
        });

        it('returns first resource when embedded rel is array', () => {
            const one = collection.get(TestResource, 'array');

            expect(one).toBeInstanceOf(TestResource);
            expect(one?.version).toBe('2.0.0');
        });

        it('returns undefined when embedded rel is empty array', () => {
            expect(collection.get(TestResource, 'empty')).toBeUndefined()
        });
    });

    describe('#getArray()', () => {
        it('returns undefined when embedded rel does not exist', () => {
            expect(collection.getArray(TestResource, 'missing'))
                .toBeUndefined();
        });

        it('returns array of resources when embedded rel is array', () => {
            const array = collection.getArray(TestResource, 'array');

            expect(array).toBeInstanceOf(Array);
            expect(array?.map(x => x.version)).toEqual(['2.0.0', '3.0.0']);
        });

        it('returns empty when embedded rel is empty array', () => {
            const array = collection.getArray(TestResource, 'empty');

            expect(array).toBeInstanceOf(Array);
            expect(array?.map(() => 1)).toEqual([]);
        });

        it('wraps value in array when rel is not array', () => {
            const array = collection.getArray(TestResource, 'object');

            expect(array).toBeInstanceOf(Array);
            expect(array?.map(x => x.version)).toEqual(['1.0.0']);
        });
    });
});
