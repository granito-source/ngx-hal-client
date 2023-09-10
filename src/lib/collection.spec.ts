import { SpectatorHttp, createHttpFactory } from '@ngneat/spectator/jest';
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
});
