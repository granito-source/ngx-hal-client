import { SpectatorHttp, createHttpFactory } from '@ngneat/spectator/jest';
import { Resource } from './resource';
import { ResourceServiceImpl } from './resource.service';

class TestResource extends Resource {
    prop?: string;

    constructor(obj: Object) {
        super(obj);
    }
}

describe('Collection', () => {
    const createService = createHttpFactory({
        service: ResourceServiceImpl
    });
    let spectator: SpectatorHttp<ResourceServiceImpl>;

    beforeEach(() => {
        spectator = createService();
    });

    it('uses first embedded array', () => {
        const collection = spectator.service.createCollection(TestResource, {
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
        });

        expect(collection.length).toBe(2);
        expect(collection[0]).toBeInstanceOf(TestResource);
        expect(collection[0]).toHaveProperty('prop', 'first - 0');
        expect(collection[1]).toBeInstanceOf(TestResource);
        expect(collection[1]).toHaveProperty('prop', 'first - 1');
        expect(collection[2]).toBeUndefined();
    });

    it('initializes as empty when no embedded arrays', () => {
        const empty = spectator.service.createCollection(TestResource, {
            _embedded: {
                num: 42
            }
        });

        expect(empty.length).toBe(0);
        expect(empty[0]).toBeUndefined();
    });
});
