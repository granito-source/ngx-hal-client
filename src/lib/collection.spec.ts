import { HttpMethod, SpectatorHttp, createHttpFactory } from '@ngneat/spectator/jest';
import { Collection } from './collection';
import { HalError } from './hal-error';
import { Resource } from './resource';
import { ResourceServiceImpl } from './resource.service';

class TestResource extends Resource {
    prop?: string;
}

describe('Collection', () => {
    const createService = createHttpFactory({
        service: ResourceServiceImpl
    });
    let spectator: SpectatorHttp<ResourceServiceImpl>;

    beforeEach(() => spectator = createService());

    describe('#data', () => {
        it('uses first embedded array', () => {
            const data = spectator.service.createCollection(TestResource, {
                _embedded: {
                    num: 42,
                    obj: {},
                    first: [
                        { prop: 'first - 0'},
                        { prop: 'first - 1'}
                    ],
                    second: [
                        { prop: 'second - 0' }
                    ]
                }
            }).data;

            expect(data.length).toBe(2);
            expect(data[0]).toBeInstanceOf(TestResource);
            expect(data[0]).toHaveProperty('prop', 'first - 0');
            expect(data[1]).toBeInstanceOf(TestResource);
            expect(data[1]).toHaveProperty('prop', 'first - 1');
            expect(data[2]).toBeUndefined();
        });

        it('initializes as empty when no embedded arrays', () => {
            const empty = spectator.service.createCollection(TestResource, {
                _embedded: {
                    num: 42
                }
            }).data;

            expect(empty.length).toBe(0);
            expect(empty[0]).toBeUndefined();
        });
    });

    describe('#refresh()', () => {
        let collection: Collection<TestResource>;

        beforeEach(() => collection =
            spectator.service.createCollection(TestResource, {
            _links: {
                self: { href: '/api/v1/items' }
            },
            _embedded: {
                collection: [
                    { prop: 'one' },
                    { prop: 'two' }
                ]
            }
        }));

        it('emits self collection when rel exists', () => {
            let test!: Collection<TestResource>;

            collection.refresh().subscribe(r => test = r);

            const req = spectator.expectOne('/api/v1/items', HttpMethod.GET);

            req.flush({
                _links: {
                    self: { href: '/api/v1/items' }
                },
                _embedded: {
                    collection: [
                        { prop: 'three' }
                    ]
                }
            });

            expect(test).toBeInstanceOf(Collection);
            expect(test.data.length).toBe(1);
            expect(test.data[0]).toBeInstanceOf(TestResource);
            expect(test.data[0]).toHaveProperty('prop', 'three');
        });

        it('throws HAL error when self rel does not exist', () => {
            const broken = spectator.service.createCollection(TestResource, {
                _links: {},
                _embedded: {
                    collection: []
                }
            });
            let error!: HalError;

            broken.refresh().subscribe({
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
                .toBe('relation \'self\' is undefined');
        });

        it('throws HAL error when self rel does not have href', () => {
            const broken = spectator.service.createCollection(TestResource, {
                _links: {
                    self: {}
                },
                _embedded: {
                    collection: []
                }
            });
            let error!: HalError;

            broken.refresh().subscribe({
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

            collection.refresh().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v1/items', HttpMethod.GET);

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

            collection.refresh().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v1/items', HttpMethod.GET);

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

    describe('#update()', () => {
        let collection: Collection<TestResource>;

        beforeEach(() => collection =
            spectator.service.createCollection(TestResource, {
            _links: {
                self: { href: '/api/v1/items' }
            },
            _embedded: {
                collection: [
                    { prop: 'one' },
                    { prop: 'two' }
                ]
            }
        }));

        it('puts data array to "self" link when it exists', () => {
            let done = false;

            collection.data[0].prop = 'uno';
            collection.update().subscribe(r => done = true);

            const req = spectator.expectOne('/api/v1/items', HttpMethod.PUT);

            req.flush(null, {
                status: 204,
                statusText: 'No Content'
            });

            expect(req.request.body).toEqual([
                { prop: 'uno' },
                { prop: 'two' }
            ]);
            expect(done).toBe(true);
        });

        it('throws HAL error when "self" rel does not exist', () => {
            const broken = spectator.service.createCollection(TestResource, {
                _links: {},
                _embedded: {
                    collection: []
                }
            });
            let error!: HalError;

            broken.update().subscribe({
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
            const broken = spectator.service.createCollection(TestResource, {
                _links: {
                    self: {}
                },
                _embedded: {
                    collection: []
                }
            });
            let error!: HalError;

            broken.update().subscribe({
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

            collection.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v1/items', HttpMethod.PUT);

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

            collection.update().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
                error: err => error = err
            });

            const req = spectator.expectOne('/api/v1/items', HttpMethod.PUT);

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
});
