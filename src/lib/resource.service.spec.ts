import { createHttpFactory, HttpMethod, SpectatorHttp } from '@ngneat/spectator/jest';
import { HalError } from './hal-error';
import { Resource } from './resource';
import { ResourceService } from './resource.service';

class TestResource extends Resource {
    prop?: string;

    constructor(obj: Object) {
        super(obj);
    }
}

describe('ResourceService', () => {
    const createService = createHttpFactory({
        service: ResourceService
    });
    let spectator: SpectatorHttp<ResourceService>;

    beforeEach(() => spectator = createService());

    it('gets created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('#get()', () => {
        it('emits resource when call is successful', () => {
            let resource!: TestResource;

            spectator.service.get(TestResource, '/api/v1')
                .subscribe(r => resource = r);

            const req = spectator.expectOne('/api/v1', HttpMethod.GET);

            req.flush({
                prop: 'defined'
            });

            expect(resource).toBeInstanceOf(TestResource);
            expect(resource.prop).toBe('defined');
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            spectator.service.get(TestResource, '/api/v2').subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v2', HttpMethod.GET);

            req.error(new ProgressEvent('error'));

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/v2');
            expect(error.status).toBeUndefined();
            expect(error.error).toBeUndefined();
            expect(error.message)
                .toMatch(/^Http failure response for \/api\/v2/);
        });

        it('throws HAL error when API reports error', () => {
            let error!: HalError;

            spectator.service.get(TestResource, '/api/v3').subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v3', HttpMethod.GET);

            req.flush({
                message: 'not logged in',
                exception: 'NotAuthenticatedException'
            }, {
                status: 401,
                statusText: 'Unauthorized'
            });

            expect(error).toBeInstanceOf(HalError);
            expect(error.name).toBe('HalError');
            expect(error.path).toBe('/api/v3');
            expect(error.status).toBe(401);
            expect(error.error).toBe('Unauthorized');
            expect(error.message).toBe('not logged in');
            expect(error['exception']).toBe('NotAuthenticatedException');
        });
    });

    describe('Resource', () => {
        let resource: TestResource;

        beforeEach(() => resource = spectator.service.create(TestResource, {
            _links: {
                self: { href: '/api/v1' },
                test: { href: '/api/v1/test' },
                broken: {},
                tmpl: { href: '/api/v1/items{?q,o}', templated: true },
                notmpl: { href: '/api/v1/items{?q}' }
            },
            _embedded: {
                obj: {
                    key: 'value'
                }
            }
        }));

        describe('#create()', () => {
            let item: TestResource;

            beforeEach(() => item = spectator.service.create(TestResource, {
                prop: 'new',
                _links: {
                    test: { href: '/api/v1/test' }
                }
            }));

            it('posts payload to link and emits location when rel exists', () => {
                let location: string | undefined;

                resource.create(item, 'tmpl').subscribe(l => location = l);

                const req = spectator.expectOne('/api/v1/items',
                    HttpMethod.POST);

                req.flush(null, {
                    status: 201,
                    statusText: 'Created',
                    headers: {
                        Location: '/api/v1/items/42'
                    }
                });

                expect(req.request.body).toEqual({ prop: 'new' });
                expect(location).toBe('/api/v1/items/42');
            });

            it('emits undefined when no location header', () => {
                let location: string | undefined = 'defined';

                resource.create(item, 'tmpl').subscribe(l => location = l);

                const req = spectator.expectOne('/api/v1/items',
                    HttpMethod.POST);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(req.request.body).toEqual({ prop: 'new' });
                expect(location).toBeUndefined();
            });

            it('uses "self" when rel is not provided', () => {
                let location: string | undefined;

                resource.create(item).subscribe(l => location = l);

                const req = spectator.expectOne('/api/v1',
                    HttpMethod.POST);

                req.flush(null, {
                    status: 201,
                    statusText: 'Created',
                    headers: {
                        Location: '/api/v1/item'
                    }
                });

                expect(req.request.body).toEqual({ prop: 'new' });
                expect(location).toBe('/api/v1/item');
            });

            it('expands href when link is templated', () => {
                let location: string | undefined;

                resource.create(item, 'tmpl', {
                    q: 'default'
                }).subscribe(l => location = l);

                const req = spectator.expectOne('/api/v1/items?q=default',
                    HttpMethod.POST);

                req.flush(null, {
                    status: 201,
                    statusText: 'Created',
                    headers: {
                        Location: '/api/v1/items/42'
                    }
                });

                expect(req.request.body).toEqual({ prop: 'new' });
                expect(location).toBe('/api/v1/items/42');
            });

            it('does try to expand href when not emplated', () => {
                let location: string | undefined;

                resource.create(item, 'notmpl', {
                    q: 'default'
                }).subscribe(l => location = l);

                const req = spectator.expectOne('/api/v1/items{?q}',
                    HttpMethod.POST);

                req.flush(null, {
                    status: 201,
                    statusText: 'Created',
                    headers: {
                        Location: '/api/v1/items/42'
                    }
                });

                expect(req.request.body).toEqual({ prop: 'new' });
                expect(location).toBe('/api/v1/items/42');
            });

            it('throws HAL error when rel does not exist', () => {
                let error!: HalError;

                resource.create(item, 'missing').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'missing\' is undefined');
            });

            it('throws HAL error when rel does not have href', () => {
                let error!: HalError;

                resource.create(item, 'broken').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'broken\' does not have href');
            });

            it('throws HAL error when connection fails', () => {
                let error!: HalError;

                resource.create(item, 'tmpl').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1/items',
                    HttpMethod.POST);

                req.error(new ProgressEvent('error'));

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1/items');
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toMatch(/^Http failure response for \/api\/v1\/items/);
            });

            it('throws HAL error when API reports error', () => {
                let error!: HalError;

                resource.create(item, 'tmpl').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1/items',
                    HttpMethod.POST);

                req.flush({
                    message: 'not logged in',
                    exception: 'NotAuthenticatedException'
                }, {
                    status: 401,
                    statusText: 'Unauthorized'
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1/items');
                expect(error.status).toBe(401);
                expect(error.error).toBe('Unauthorized');
                expect(error.message).toBe('not logged in');
                expect(error['exception']).toBe('NotAuthenticatedException');
            });
        });

        describe('#read()', () => {
            it('emits requested resource when rel exists', () => {
                let test!: TestResource;

                resource.read(TestResource, 'test').subscribe(r => test = r);

                const req = spectator.expectOne('/api/v1/test',
                    HttpMethod.GET);

                req.flush({ prop: 'value' });

                expect(test).toBeInstanceOf(TestResource);
                expect(test.prop).toBe('value');
            });

            it('expands href when templated', () => {
                resource.read(TestResource, 'tmpl', {
                    q: 'query',
                    o: 'asc'
                }).subscribe();

                const req = spectator.expectOne('/api/v1/items?q=query&o=asc',
                    HttpMethod.GET);

                req.flush({});
            });

            it('does not try to expand href when not templated', () => {
                resource.read(TestResource, 'notmpl', {
                    q: 'query'
                }).subscribe();

                const req = spectator.expectOne('/api/v1/items{?q}',
                    HttpMethod.GET);

                req.flush({});
            });

            it('throws HAL error when rel does not exist', () => {
                let error!: HalError;

                resource.read(TestResource, 'missing').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'missing\' is undefined');
            });

            it('throws HAL error when rel does not have href', () => {
                let error!: HalError;

                resource.read(TestResource, 'broken').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'broken\' does not have href');
            });

            it('throws HAL error when connection fails', () => {
                let error!: HalError;

                resource.read(TestResource, 'test').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1/test',
                    HttpMethod.GET);

                req.error(new ProgressEvent('error'));

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1/test');
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toMatch(/^Http failure response for \/api\/v1\/test/);
            });

            it('throws HAL error when API reports error', () => {
                let error!: HalError;

                resource.read(TestResource, 'test').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1/test',
                    HttpMethod.GET);

                req.flush({
                    message: 'not logged in',
                    exception: 'NotAuthenticatedException'
                }, {
                    status: 401,
                    statusText: 'Unauthorized'
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1/test');
                expect(error.status).toBe(401);
                expect(error.error).toBe('Unauthorized');
                expect(error.message).toBe('not logged in');
                expect(error['exception']).toBe('NotAuthenticatedException');
            });
        });

        describe('#update()', () => {
            it('puts payload to "self" link when it exists', () => {
                let done = false;

                resource.prop = 'updated';
                resource.update().subscribe(r => done = true);

                const req = spectator.expectOne('/api/v1', HttpMethod.PUT);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(req.request.body).toEqual({ prop: 'updated' });
                expect(done).toBe(true);
            });

            it('throws HAL error when "self" rel does not exist', () => {
                const noSelf = spectator.service.create(TestResource, {
                    _links: {}
                });
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
                expect(error.message).toBe('relation \'self\' is undefined');
            });

            it('throws HAL error when "self" rel does not have href', () => {
                const noSelf = spectator.service.create(TestResource, {
                    _links: {
                        self: {}
                    }
                });
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
                expect(error.message)
                    .toBe('relation \'self\' does not have href');
            });

            it('throws HAL error when connection fails', () => {
                let error!: HalError;

                resource.update().subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1', HttpMethod.PUT);

                req.error(new ProgressEvent('error'));

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1');
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toMatch(/^Http failure response for \/api\/v1/);
            });

            it('throws HAL error when API reports error', () => {
                let error!: HalError;

                resource.update().subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1', HttpMethod.PUT);

                req.flush({
                    message: 'not logged in',
                    exception: 'NotAuthenticatedException'
                }, {
                    status: 401,
                    statusText: 'Unauthorized'
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1');
                expect(error.status).toBe(401);
                expect(error.error).toBe('Unauthorized');
                expect(error.message).toBe('not logged in');
                expect(error['exception']).toBe('NotAuthenticatedException');
            });
        });

        describe('#delete()', () => {
            it('deletes linked resource when good rel provided', () => {
                let done = false;

                resource.delete('test').subscribe(() => done = true);

                const req = spectator.expectOne('/api/v1/test',
                    HttpMethod.DELETE);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(done).toBe(true);
            });

            it('deletes "self" when no rel provided', () => {
                let done = false;

                resource.delete().subscribe(() => done = true);

                const req = spectator.expectOne('/api/v1', HttpMethod.DELETE);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(done).toBe(true);
            });

            it('expands href when templated', () => {
                let done = false;

                resource.delete('tmpl', { q: 'old' })
                    .subscribe(() => done = true);

                const req = spectator.expectOne('/api/v1/items?q=old',
                    HttpMethod.DELETE);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(done).toBe(true);
            });

            it('does not try to expand href when not templated', () => {
                let done = false;

                resource.delete('notmpl', { q: 'old' })
                    .subscribe(() => done = true);

                const req = spectator.expectOne('/api/v1/items{?q}',
                    HttpMethod.DELETE);

                req.flush(null, {
                    status: 204,
                    statusText: 'No Content'
                });

                expect(done).toBe(true);
            });

            it('throws HAL error when rel does not exist', () => {
                let error!: HalError;

                resource.delete('missing').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'missing\' is undefined');
            });

            it('throws HAL error when rel does not have href', () => {
                let error!: HalError;

                resource.delete('broken').subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBeUndefined();
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toBe('relation \'broken\' does not have href');
            });

            it('throws HAL error when connection fails', () => {
                let error!: HalError;

                resource.delete().subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1', HttpMethod.DELETE);

                req.error(new ProgressEvent('error'));

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1');
                expect(error.status).toBeUndefined();
                expect(error.error).toBeUndefined();
                expect(error.message)
                    .toMatch(/^Http failure response for \/api\/v1/);
            });

            it('throws HAL error when API reports error', () => {
                let error!: HalError;

                resource.delete().subscribe({
                    next: () => fail('no next is expected'),
                    complete: () => fail('no complete is expected'),
                    error: err => error = err
                });

                const req = spectator.expectOne('/api/v1', HttpMethod.DELETE);

                req.flush({
                    message: 'not logged in',
                    exception: 'NotAuthenticatedException'
                }, {
                    status: 401,
                    statusText: 'Unauthorized'
                });

                expect(error).toBeInstanceOf(HalError);
                expect(error.name).toBe('HalError');
                expect(error.path).toBe('/api/v1');
                expect(error.status).toBe(401);
                expect(error.error).toBe('Unauthorized');
                expect(error.message).toBe('not logged in');
                expect(error['exception']).toBe('NotAuthenticatedException');
            });
        });
    });
});
