import { createHttpFactory, HttpMethod,
    SpectatorHttp } from '@ngneat/spectator/jest';
import { Accessor, Collection, HalClientService, HalError,
    Resource } from './internal';

class TestResource extends Resource {
    version!: string;

    edit(version: string): TestResource {
        return this.clone({ version });
    }
}

describe('Resource', () => {
    const createService = createHttpFactory({
        service: HalClientService
    });
    let spectator: SpectatorHttp<HalClientService>;
    let resource: TestResource;
    let noSelf: TestResource;
    let noHref: TestResource;

    beforeEach(() => {
        spectator = createService();
        resource = new TestResource({
            _client: spectator.httpClient,
            _links: {
                self: { href: '/api/test' },
                find: {
                    href: '/api/search{?q}',
                    methods: ['GET', 'DELETE'],
                    templated: true
                },
                notmpl: {
                    href: '/api/search{?q}'
                }
            },
            _embedded: {
                test: {
                    version: '1.0.0'
                },
                array: [
                    { version: '2.0.0' },
                    { version: '3.0.0' }
                ],
                empty: []
            },
            version: '1.7.2'
        });
        noSelf = new TestResource({
            _client: spectator.httpClient,
            _links: {},
            version: '1.7.2'
        });
        noHref = new TestResource({
            _client: spectator.httpClient,
            _links: {
                self: {}
            },
            version: '1.7.2'
        });
    });

    it('gets created', () => {
        expect(resource).toBeDefined();
        expect(resource.self).toBe('/api/test');
    });

    it('can be cloned/edited', () => {
        const edited = resource.edit('9.5.1');

        expect(edited).not.toBe(resource);
        expect(edited.version).toBe('9.5.1');
    });

    describe('#follow()', () => {
        it('returns undefined when rel does not exist', () => {
            expect(resource.follow('missing')).toBeUndefined();
        });

        it('returns undefined when rel does not have href', () => {
            expect(noHref.follow('self')).toBeUndefined();
        });

        it('returns accessor with link when rel exists', () => {
            const accessor = resource.follow('find');

            expect(accessor).toBeDefined();
            expect(accessor?.self).toBe('/api/search');
        });

        it('expands parameters when link is templated', () => {
            const accessor = resource.follow('find', { q: 'test'});

            expect(accessor).toBeDefined();
            expect(accessor?.self).toBe('/api/search?q=test');
        });

        it('does not expand parameters when link is not templated', () => {
            const accessor = resource.follow('notmpl', { q: 'test'});

            expect(accessor).toBeDefined();
            expect(accessor?.self).toBe('/api/search{?q}');
        });

        it('preserves methods array when present', () => {
            const accessor = resource.follow('find');

            expect(accessor?.canCreate).toBe(false);
            expect(accessor?.canRead).toBe(true);
            expect(accessor?.canDelete).toBe(true);
        });
    });

    describe('#canCreate', () => {
        it('is true when no methods array', () => {
            const noMethods = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/v1/items' }
                }
            });

            expect(noMethods.canCreate).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Resource({
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
            const noPost = new Resource({
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
            const withPost = new Resource({
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
            const withPost = new Resource({
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
            let next: Accessor | undefined;
            let complete = false;

            resource.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
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
            expect(next?.self).toBe('/api/test/42');
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.create(item).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when self rel does have href', () => {
            let error!: HalError;

            noHref.create(item).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('posts array when payload is array of resources', () => {
            let next: Accessor | undefined;
            let complete = false;

            resource.create([item, item]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
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
            expect(next?.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of primitives', () => {
            let next: Accessor | undefined;
            let complete = false;

            resource.create([0, 'zero', false, null, undefined]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
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
            expect(next?.self).toBe('/api/test');
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
            let next: Accessor | undefined;
            let complete = false;

            resource.create(collection).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
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
            expect(next?.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('emits undefined when no location', () => {
            const item = new TestResource({ version: '3.5.7' });
            let next: Accessor | undefined;
            let complete = false;

            resource.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created'
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next).toBeUndefined();
            expect(complete).toBe(true);
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            resource.create(item).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

            resource.create(item).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
        it('is true when no methods array', () => {
            const noMethods = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/v1/items' }
                }
            });

            expect(noMethods.canRead).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Resource({
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
            const noPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['POST']
                    }
                }
            });

            expect(noPost.canRead).toBe(false);
        });

        it('is true when GET is in methods array', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['PUT', 'GET', 'DELETE']
                    }
                }
            });

            expect(withPost.canRead).toBe(true);
        });

        it('is true when GET matches case insensitively', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'GeT']
                    }
                }
            });

            expect(withPost.canRead).toBe(true);
        });
    });

    describe('#read()', () => {
        it('emits resource at self link when it exists', () => {
            let next: TestResource | undefined;
            let complete = false;

            resource.read().subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.GET);

            req.flush({ version: '2.7.1' });

            expect(next).toBeInstanceOf(TestResource);
            expect(next?.version).toBe('2.7.1');
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.read().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.read().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            resource.read().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

            resource.read().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
        it('is true when no methods array', () => {
            const noMethods = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/v1/items/8' }
                }
            });

            expect(noMethods.canUpdate).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items/8',
                        methods: 'PUT'
                    }
                }
            });

            expect(notArray.canUpdate).toBe(true);
        });

        it('is false when no PUT in methods array', () => {
            const noPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items/8',
                        methods: ['GET']
                    }
                }
            });

            expect(noPost.canUpdate).toBe(false);
        });

        it('is true when PUT is in methods array', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items/8',
                        methods: ['GET', 'PUT', 'DELETE']
                    }
                }
            });

            expect(withPost.canUpdate).toBe(true);
        });

        it('is true when PUT matches case insensitively', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items/8',
                        methods: [null, 'pUt']
                    }
                }
            });

            expect(withPost.canUpdate).toBe(true);
        });
    });

    describe('#update()', () => {
        it('puts payload to self when it exists', () => {
            let next: Accessor | undefined;
            let complete = false;

            resource.version = '7.0.1';
            resource.update().subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            });

            const req = spectator.expectOne('/api/test', HttpMethod.PUT);

            req.flush(null, {
                status: 204,
                statusText: 'No Content'
            });

            expect(req.request.body).toEqual({ version: '7.0.1' });
            expect(next?.self).toBe('/api/test');
            expect(complete).toBe(true);
        });

        it('throws HAL error when self rel does not exist', () => {
            let error!: HalError;

            noSelf.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            resource.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

            resource.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
        it('is true when no methods array', () => {
            const noMethods = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: { href: '/api/v1/items' }
                }
            });

            expect(noMethods.canDelete).toBe(true);
        });

        it('is true when methods is not an array', () => {
            const notArray = new Resource({
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
            const noPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET']
                    }
                }
            });

            expect(noPost.canDelete).toBe(false);
        });

        it('is true when DELETE is in methods array', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: ['GET', 'DELETE', 'PUT']
                    }
                }
            });

            expect(withPost.canDelete).toBe(true);
        });

        it('is true when DELETE matches case insensitively', () => {
            const withPost = new Resource({
                _client: spectator.httpClient,
                _links: {
                    self: {
                        href: '/api/v1/items',
                        methods: [null, 'DeLeTe']
                    }
                }
            });

            expect(withPost.canDelete).toBe(true);
        });
    });

    describe('#delete()', () => {
        it('deletes resource at self link when it exists', () => {
            let next = false;
            let complete = false;

            resource.delete().subscribe({
                next: () => next = true,
                complete: () => complete = true,
                error: () => fail('no error is expected')
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
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when self rel does not have href', () => {
            let error!: HalError;

            noHref.delete().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBeUndefined();
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message).toBe('no valid "self" relation');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            resource.delete().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

            resource.delete().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
            expect(resource.get(TestResource, 'missing')).toBeUndefined();
        });

        it('returns resource when embedded rel exists', () => {
            const test = resource.get(TestResource, 'test');

            expect(test).toBeDefined();
            expect(test?.version).toBe('1.0.0');
        });

        it('returns first resource when embedded rel is array', () => {
            const one = resource.get(TestResource, 'array');

            expect(one).toBeDefined();
            expect(one?.version).toBe('2.0.0');
        });

        it('returns undefined when embedded rel is empty array', () => {
            expect(resource.get(TestResource, 'empty')).toBeUndefined()
        });
    });

    describe('#getArray()', () => {
        it('returns undefined when embedded rel does not exist', () => {
            expect(resource.getArray(TestResource, 'missing'))
                .toBeUndefined();
        });

        it('returns array of resources when embedded rel is array', () => {
            const array = resource.getArray(TestResource, 'array');

            expect(array).toBeDefined();
            expect(array?.map(x => x.version)).toEqual(['2.0.0', '3.0.0']);
        });

        it('returns empty when embedded rel is empty array', () => {
            const array = resource.getArray(TestResource, 'empty');

            expect(array).toBeDefined();
            expect(array?.map(x => 1)).toEqual([]);
        });

        it('wraps value in array when rel is not array', () => {
            const array = resource.getArray(TestResource, 'test');

            expect(array).toBeDefined();
            expect(array?.map(x => x.version)).toEqual(['1.0.0']);
        });
    });
});
