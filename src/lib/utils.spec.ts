import { createSpyObject } from '@ngneat/spectator/jest';
import { cold } from 'jest-marbles';
import { Accessor, Collection, Resource, follow, objectFrom, readCollection } from './internal';

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

describe('follow()', () => {
    it('maps to results of .follow() when it returns undefined', () => {
        const resource = createSpyObject(Resource);
        const observable = cold('--r-|', {
            r: resource
        });

        resource.follow.andReturn(undefined);

        expect(observable.pipe(
            follow('link', { p: 'param' })
        )).toBeObservable(cold('--u-|', {
            u: undefined
        }));
        expect(observable).toSatisfyOnFlush(() => {
            expect(resource.follow).toHaveBeenCalledTimes(1);
            expect(resource.follow).toHaveBeenCalledWith('link',
                { p: 'param' });
        });
    });

    it('maps to results of .follow() when it returns accessor', () => {
        const accessor = new Accessor({
            _links: {
                self: { href: '/api/link' }
            }
        });
        const resource = createSpyObject(Resource);
        const observable = cold('--r-|', {
            r: resource
        });

        resource.follow.andReturn(accessor);

        expect(observable.pipe(
            follow('link', { p: 'param' })
        )).toBeObservable(cold('--a-|', {
            a: accessor
        }));
        expect(observable).toSatisfyOnFlush(() => {
            expect(resource.follow).toHaveBeenCalledTimes(1);
            expect(resource.follow).toHaveBeenCalledWith('link',
                { p: 'param' });
        });
    });
});

describe('readCollection()', () => {
    it('maps undefined to nothing', () => {
        const observable = cold('--u-|', {
            u: undefined
        });

        expect(observable.pipe(
            readCollection(Resource)
        )).toBeObservable(cold('----|'));
    });

    it('maps null to nothing', () => {
        const observable = cold('--n-|', {
            n: null
        });

        expect(observable.pipe(
            readCollection(Resource)
        )).toBeObservable(cold('----|'));
    });

    it('maps Accessor to .readCollection() results', () => {
        const collection = new Collection(Resource, {
            _embedded: {
                resources: []
            }
        });
        const accessor = createSpyObject(Accessor);
        const observable = cold('--a----|', {
            a: accessor
        });

        accessor.readCollection.andReturn(cold('--c|', { c: collection }));

        expect(observable.pipe(
            readCollection(Resource)
        )).toBeObservable(cold('----c--|', { c: collection }));
        expect(observable).toSatisfyOnFlush(() => {
            expect(accessor.readCollection).toHaveBeenCalledTimes(1);
            expect(accessor.readCollection).toHaveBeenCalledWith(Resource);
        });
    });
});
