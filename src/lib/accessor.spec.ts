import { createHttpFactory, HttpMethod, SpectatorHttp } from '@ngneat/spectator/jest';
import { Accessor } from './accessor';
import { HalClientService } from './hal-client.service';
import { HalError } from './hal-error';
import { Resource } from './resource';
import { Collection } from './collection';

class TestResource extends Resource {
    version!: string;
}

describe('Accessor', () => {
    const createService = createHttpFactory({
        service: HalClientService
    });
    let spectator: SpectatorHttp<HalClientService>;
    let accessor: Accessor;

    beforeEach(() => {
        spectator = createService();
        accessor = spectator.service.root('/api/root');
    });

    it('gets initially created from HalClientService#root()', () => {
        expect(accessor).toBeDefined();
        expect(accessor.self).toBe('/api/root');
    });

    describe('#create()', () => {
        const item = new TestResource({ version: '3.5.7' });

        it('posts payload to self and emits Accessor when location is given', () => {
            let next: Accessor | undefined;
            let complete = false;

            accessor.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

            req.flush(null, {
                status: 201,
                statusText: 'Created',
                headers: {
                    Location: '/api/root/42'
                }
            });

            expect(req.request.body).toEqual({ version: '3.5.7' });
            expect(next?.self).toBe('/api/root/42');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of resources', () => {
            let next: Accessor | undefined;
            let complete = false;

            accessor.create([item, item]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

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
            expect(next?.self).toBe('/api/root');
            expect(complete).toBe(true);
        });

        it('posts array when payload is array of primitives', () => {
            let next: Accessor | undefined;
            let complete = false;

            accessor.create([0, 'zero', false, null, undefined]).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

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
            expect(next?.self).toBe('/api/root');
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

            accessor.create(collection).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

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
            expect(next?.self).toBe('/api/root');
            expect(complete).toBe(true);
        });

        it('posts payload to self and emits undefined when no location', () => {
            const item = new TestResource({ version: '3.5.7' });
            let next: Accessor | undefined;
            let complete = false;

            accessor.create(item).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

            const req = spectator.expectOne('/api/root', HttpMethod.POST);

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

            accessor.create(item).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

    describe('#read()', () => {
        it('emits resource at self link', () => {
            let next!: TestResource;
            let complete = false;

            accessor.read(TestResource).subscribe({
                next: r => next = r,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

            const req = spectator.expectOne('/api/root', HttpMethod.GET);

            req.flush({ version: '2.7.1' });

            expect(next).toBeInstanceOf(TestResource);
            expect(next.version).toBe('2.7.1');
            expect(complete).toBe(true);
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.read(TestResource).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
                error: () => fail('no error is expected')
            })

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
            expect(next.rawValues).toEqual([
                {
                    version: '1.0.0'
                },
                {
                    version: '2.0.0'
                }
            ]);
            expect(complete).toBe(true);
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.readCollection(TestResource).subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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

    describe('#delete()', () => {
        it('deletes resource at self link', () => {
            let next = false;
            let complete = false;

            accessor.delete().subscribe({
                next: () => next = true,
                complete: () => complete = true,
                error: () => fail('no error is expected')
            })

            const req = spectator.expectOne('/api/root', HttpMethod.DELETE);

            req.flush(null, {
                status: 204,
                statusText: 'No Content'
            });

            expect(next).toBe(true);
            expect(complete).toBe(true);
        });

        it('throws HAL error when connection fails', () => {
            let error!: HalError;

            accessor.delete().subscribe({
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
                next: () => fail('no next is expected'),
                complete: () => fail('no complete is expected'),
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
