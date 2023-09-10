import { Collection } from './collection';

describe('Collection', () => {
    const collection = new Collection<string>({
        _embedded: {
            num: 42,
            obj: {},
            first: [
                'first - 0',
                'first - 1'
            ],
            second: [
                'second - 0'
            ]
        }
    });

    it('uses first embedded array', () => {
        expect(collection.length).toBe(2);
        expect(collection[0]).toBe('first - 0');
        expect(collection[1]).toBe('first - 1');
        expect(collection[2]).toBeUndefined();
    });

    it('initializes as empty when no embedded arrays', () => {
        const empty = new Collection<string>({
            _embedded: {
                num: 42
            }
        });

        expect(empty.length).toBe(0);
        expect(empty[0]).toBeUndefined();
    });
});
