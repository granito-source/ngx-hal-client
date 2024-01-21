import { Collection } from './collection';
import { Resource, objectFrom } from './internal';

describe('objectFrom', () => {
    it('returns undefined when parameter is undefined', () => {
        expect(objectFrom(undefined)).toBeUndefined();
    });

    it('returns null when parameter is null', () => {
        expect(objectFrom(null)).toBeNull();
    });

    it('returns same boolean when parameter is boolean', () => {
        expect(objectFrom(true)).toBe(true);
        expect(objectFrom(false)).toBe(false);
    });

    it('returns same number when parameter is number', () => {
        expect(objectFrom(0)).toBe(0);
        expect(objectFrom(42)).toBe(42);
    });

    it('returns same string when parameter is string', () => {
        expect(objectFrom('')).toBe('');
        expect(objectFrom('fourty-two')).toBe('fourty-two');
    });

    it('removes HAL properties when parameter is object', () => {
        expect(objectFrom({
            _client: {},
            _links: {},
            _embedded: {},
            id: 1,
            text: 'One'
        })).toEqual({
            id: 1,
            text: 'One'
        });
    });

    it('converts every item when parameter is array', () => {
        expect(objectFrom([
            undefined,
            null,
            true,
            42,
            'fourty-two',
            {
                _client: {},
                _links: {},
                _embedded: {},
                id: 1,
                text: 'One'
            }
        ])).toEqual([
            undefined,
            null,
            true,
            42,
            'fourty-two',
            {
                id: 1,
                text: 'One'
            }
        ]);
    });

    it('returns converted values when parameter is collection', () => {
        expect(objectFrom(new Collection(Resource, {
            _embedded: {
                values: [
                    {
                        _client: {},
                        _links: {},
                        _embedded: {},
                        id: 1,
                        text: 'One'
                    },
                    {
                        _client: {},
                        _links: {},
                        _embedded: {},
                        id: 2,
                        text: 'Two'
                    }
                ]
            }
        }))).toEqual([
            {
                id: 1,
                text: 'One'
            },
            {
                id: 2,
                text: 'Two'
            }
        ]);
    });
});
