import { createHttpFactory, HttpMethod, SpectatorHttp } from '@ngneat/spectator/jest';
import { HalError } from './hal-error';
import { Resource } from './resource';
import { ResourceService } from './resource.service';

class TestResource extends Resource {
    readonly prop?: string;

    constructor(obj: any) {
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
        it('returns resource when call is successful', () => {
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
            expect(error.message).toMatch(/^Http failure response for \/api\/v2/);
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
        let resource: Resource;

        beforeEach(() => resource = spectator.service.create(Resource, {
            _links: {
                self: { href: '/api/v1' },
                test: { href: '/api/v1/test' },
                broken: {}
            }
        }));

        it('#read() returns requested resource when rel exists', () => {
            let test!: TestResource;

            resource.read(TestResource, 'test').subscribe(r => test = r);

            const req = spectator.expectOne('/api/v1/test', HttpMethod.GET);

            req.flush({ prop: 'value' });

            expect(test).toBeInstanceOf(TestResource);
            expect(test.prop).toBe('value');
        });

        it('#read() throws HAL error when rel does not exist', () => {
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
            expect(error.message).toBe('relation \'missing\' is undefined');
        });

        it('#read() throws HAL error when rel does not have href', () => {
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
    });
});
