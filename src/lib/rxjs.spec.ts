import { createSpyObject } from '@ngneat/spectator/vitest';
import { Accessor, Collection, completeWith, create, defined, del, follow,
    mutate, read, readCollection, refresh, Resource,
    update } from './internal';
import { Observable } from 'rxjs';
import { cold } from "@granito/vitest-marbles";
import { describe } from "vitest";

class TestResource extends Resource {
    declare id: number;
}

describe('completeWith()', () => {
    it('makes source complete together with lifetime observable', () => {
        const source = cold('-x-x-x-x-x');
        const lifetime = cold('----|');

        expect(source.pipe(
            completeWith(lifetime)
        )).toBeObservable(cold('-x-x|'));
    });
});

describe('defined()', () => {
    it('filters out null and undefiled elements', () => {
        const source = cold('bisuona|', {
            b: false,
            i: 0,
            s: '',
            u: undefined,
            o: {},
            n: null,
            a: []
        });

        expect(source.pipe(
            defined()
        )).toBeObservable(cold('bis-o-a|', {
            b: false,
            i: 0,
            s: '',
            o: {},
            a: []
        }));
    });
});

describe('follow()', () => {
    it('maps undefined to undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            follow('link')
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            follow('link')
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps to results of .follow() when it returns undefined', () => {
        const resource = createSpyObject(TestResource);
        const source = cold('--r-|', { r: resource });

        resource.follow.andReturn(undefined);

        expect(source.pipe(
            follow('link', { p: 'param' })
        )).toBeObservable(cold('--u-|', { u: undefined }));
        expect(source).toSatisfyOnFlush(() => {
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
        const resource = createSpyObject(TestResource);
        const source = cold('--r-|', { r: resource });

        resource.follow.andReturn(accessor);

        expect(source.pipe(
            follow('link', { p: 'param' })
        )).toBeObservable(cold('--a-|', { a: accessor }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.follow).toHaveBeenCalledTimes(1);
            expect(resource.follow).toHaveBeenCalledWith('link',
                { p: 'param' });
        });
    });
});

describe('create()', () => {
    it('maps undefined to undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            create({ id: 1 })
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            create({ id: 1 })
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Accessor to .create() result', () => {
        const result = new Accessor({
            _links: {
                self: { href: '/api/resource' }
            }
        });
        const accessor = createSpyObject(Accessor);
        const source = cold('--a----|', { a: accessor });

        accessor.create.andReturn(cold('--a|', { a: result }));

        expect(source.pipe(
            create({ id: 1 })
        )).toBeObservable(cold('----a--|', { a: result }));
        expect(source).toSatisfyOnFlush(() => {
            expect(accessor.create).toHaveBeenCalledTimes(1);
            expect(accessor.create).toHaveBeenCalledWith({ id: 1 });
        });
    });

    it('maps Resource to .create() result', () => {
        const accessor = new Accessor({
            _links: {
                self: { href: '/api/resource' }
            }
        });
        const resource = createSpyObject(TestResource);
        const source = cold('--r----|', { r: resource });

        resource.create.andReturn(cold('--a|', { a: accessor }));

        expect(source.pipe(
            create({ id: 1 })
        )).toBeObservable(cold('----a--|', { a: accessor }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.create).toHaveBeenCalledTimes(1);
            expect(resource.create).toHaveBeenCalledWith({ id: 1 });
        });
    });
});

describe('read()', () => {
    it('maps undefined to undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            read(TestResource)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            read(TestResource)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Accessor to .read() result', () => {
        const resource = new TestResource({
            id: 1,
            _links: {
                self: { href: '/api/resource' }
            }
        });
        const accessor = createSpyObject(Accessor);
        const source = cold('--a----|', { a: accessor });

        accessor.read.andReturn(cold('--r|', { r: resource }));

        expect(source.pipe(
            read(TestResource)
        )).toBeObservable(cold('----r--|', { r: resource }));
        expect(source).toSatisfyOnFlush(() => {
            expect(accessor.read).toHaveBeenCalledTimes(1);
            expect(accessor.read).toHaveBeenCalledWith(TestResource);
        });
    });
});

describe('readCollection()', () => {
    it('maps undefined to undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            readCollection(TestResource)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            readCollection(TestResource)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Accessor to .readCollection() result', () => {
        const collection = new Collection(TestResource, {
            _embedded: {
                resources: []
            }
        });
        const accessor = createSpyObject(Accessor);
        const source = cold('--a----|', { a: accessor });

        accessor.readCollection.andReturn(cold('--c|', { c: collection }));

        expect(source.pipe(
            readCollection(TestResource)
        )).toBeObservable(cold('----c--|', { c: collection }));
        expect(source).toSatisfyOnFlush(() => {
            expect(accessor.readCollection).toHaveBeenCalledTimes(1);
            expect(accessor.readCollection).toHaveBeenCalledWith(TestResource);
        });
    });
});

describe('refresh()', () => {
    it('maps undefined to undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            refresh()
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            refresh()
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Resource to .read() result', () => {
        const result = new TestResource({
            id: 1,
            _links: {
                self: { href: '/api/resource' }
            }
        });
        const resource = createSpyObject(TestResource);
        const source = cold('--r----|', { r: resource });

        resource.read.andReturn(cold('--r|', { r: result }));

        expect(source.pipe(
            refresh()
        )).toBeObservable(cold('----r--|', { r: result }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.read).toHaveBeenCalledTimes(1);
            expect(resource.read).toHaveBeenCalledWith();
        });
    });

    it('maps Collection to .read() result', () => {
        const result = new Collection(TestResource, {
            _embedded: {
                resources: []
            }
        });
        const collection = createSpyObject(Collection);
        const source = cold('--c----|', { c: collection });

        collection.read.andReturn(cold('--c|', { c: result }));

        expect(source.pipe(
            refresh()
        )).toBeObservable(cold('----c--|', { c: result }));
        expect(source).toSatisfyOnFlush(() => {
            expect(collection.read).toHaveBeenCalledTimes(1);
            expect(collection.read).toHaveBeenCalledWith();
        });
    });
});

describe('mutate()', () => {
    it('maps undefined to undefined', () => {
        const source: Observable<TestResource | undefined> =
            cold('--u-|', { u: undefined });

        expect(source.pipe(
            mutate(resource => resource.id++)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source: Observable<TestResource | null> =
            cold('--n-|', { n: null });

        expect(source.pipe(
            mutate(resource => resource.id++)
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Resource to mutate() result', () => {
        const update = () => {};
        const resource = createSpyObject(TestResource, { id: 1 });
        const mutated = createSpyObject(TestResource, { id: 2 });
        const source: Observable<TestResource | undefined> =
            cold('--r----|', { r: resource });

        resource.mutate.andReturn(mutated);

        expect(source.pipe(
            mutate(update)
        )).toBeObservable(cold('--m----|', { m: mutated }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.mutate).toHaveBeenCalledTimes(1);
            expect(resource.mutate).toHaveBeenCalledWith(update);
        });
    });
});

describe('update()', () => {
    it('maps undefined to undefined', () => {
        const source: Observable<TestResource | undefined> =
            cold('--u-|', { u: undefined });

        expect(source.pipe(
            update()
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps null to undefined', () => {
        const source: Observable<TestResource | null> =
            cold('--n-|', { n: null });

        expect(source.pipe(
            update()
        )).toBeObservable(cold('--u-|', { u: undefined }));
    });

    it('maps Resource to update() result', () => {
        const resource = createSpyObject(TestResource, { id: 1 });
        const source: Observable<TestResource | undefined> =
            cold('--r----|', { r: resource });

        resource.update.andReturn(cold('--r|', { r: resource }));

        expect(source.pipe(
            update()
        )).toBeObservable(cold('----r--|', { r: resource }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.update).toHaveBeenCalledTimes(1);
            expect(resource.update).toHaveBeenCalledWith();
        });
    });
});

describe('del()', () => {
    it('does nothing for undefined', () => {
        const source = cold('--u-|', { u: undefined });

        expect(source.pipe(
            del()
        )).toBeObservable(cold('--v-|', { v: undefined }));
    });

    it('does nothing for null', () => {
        const source = cold('--n-|', { n: null });

        expect(source.pipe(
            del()
        )).toBeObservable(cold('--v-|', { v: undefined }));
    });

    it('calls delete() on Accessor', () => {
        const accessor = createSpyObject(Accessor);
        const source = cold('--a----|', { a: accessor });

        accessor.delete.andReturn(cold('--v|', { v: undefined }));

        expect(source.pipe(
            del()
        )).toBeObservable(cold('----v--|', { v: undefined }));
        expect(source).toSatisfyOnFlush(() => {
            expect(accessor.delete).toHaveBeenCalledTimes(1);
            expect(accessor.delete).toHaveBeenCalledWith();
        });
    });

    it('calls delete() on Resource', () => {
        const resource = createSpyObject(TestResource);
        const source = cold('--r----|', { r: resource });

        resource.delete.andReturn(cold('--v|', { v: undefined }));

        expect(source.pipe(
            del()
        )).toBeObservable(cold('----v--|', { v: undefined }));
        expect(source).toSatisfyOnFlush(() => {
            expect(resource.delete).toHaveBeenCalledTimes(1);
            expect(resource.delete).toHaveBeenCalledWith();
        });
    });
});
