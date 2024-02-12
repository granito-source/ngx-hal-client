import { Collection, Resource, isDefined, objectFrom } from './internal';

describe('objectFrom()', () => {
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

describe('isDefined()', () => {
    it('returns false when null', () => {
        expect(isDefined(null)).toBe(false);
    });

    it('returns false when undefined', () => {
        expect(isDefined(undefined)).toBe(false);
    });

    it('returns true when boolean', () => {
        expect(isDefined(false)).toBe(true);
        expect(isDefined(true)).toBe(true);
    });

    it('returns true when number', () => {
        expect(isDefined(0)).toBe(true);
        expect(isDefined(42)).toBe(true);
    });

    it('returns true when string', () => {
        expect(isDefined('')).toBe(true);
        expect(isDefined('fourty-two')).toBe(true);
    });

    it('returns true when Object', () => {
        expect(isDefined({})).toBe(true);
        expect(isDefined({ answer: 'fourty-two' })).toBe(true);
    });

    it('returns true when Array', () => {
        expect(isDefined([])).toBe(true);
        expect(isDefined(['fourty-two'])).toBe(true);
    });
});
