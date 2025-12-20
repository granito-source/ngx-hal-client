[![Build](https://github.com/granito-source/ngx-hal-client/actions/workflows/build.yaml/badge.svg)](https://github.com/granito-source/ngx-hal-client/actions/workflows/build.yaml)
[![Latest Version](https://img.shields.io/npm/v/%40granito%2Fngx-hal-client.svg)](https://npm.im/@granito/ngx-hal-client)
[![License](https://img.shields.io/github/license/granito-source/ngx-hal-client?color=blue)](https://github.com/granito-source/ngx-hal-client/blob/main/LICENSE)

This is a
[Hypertext Application Language](https://en.wikipedia.org/wiki/Hypertext_Application_Language)
(HAL) client to be used in [Angular](https://angular.io/) projects.

## Installation

Using [npm](https://npmjs.org/):

```shell
$ npm install @granito/ngx-hal-client --save
```

## Building from source

```shell
$ git clone https://github.com/granito-source/ngx-hal-client.git
$ cd ngx-hal-client
$ npm install
$ npm run build
```

### Running the tests

```shell
$ npm tests
```

## Basic usage

For illustrative purposes, let's assume that your Angular application
needs to work with the following HAL API.

The root entry point is `/api/v1`. When one executes `GET` on this URI,
the returned object looks like

```json
{
    "apiVersion": "1.7.21",
    "_links": {
        "self": {
            "href": "/api/v1"
        },
        "messages": {
            "href": "/api/v1/messages"
        }
    }
}
```

In other words, it exposes the implementation version and declares one
link to work with a collection of messages. When one executes `GET` on
`/api/v1/messages` the API returns a collection page like this

```json
{
    "start": 0,
    "_links": {
        "self": {
            "href": "/api/v1/messages?start=0"
        },
        "next": {
            "href": "/api/v1/messages?start=2"
        }
    },
    "_embedded": {
        "selected" : {
            "id": 0,
            "text": "Then what do they call it?",
            "_links": {
                "self": {
                    "href": "/api/v1/messages/0"
                }
            }
        },
        "items": [
            {
                "id": 0,
                "text": "Then what do they call it?",
                "_links": {
                    "self": {
                        "href": "/api/v1/messages/0"
                    },
                    "next": {
                        "href": "/api/v1/messages/1"
                    },
                }
            },
            {
                "id": 1,
                "text": "They call it Royale with Cheese.",
                "_links": {
                    "self": {
                        "href": "/api/v1/messages/1"
                    },
                    "prev": {
                        "href": "/api/v1/messages/0"
                    }
                }
            }
        ]
    }
}
```

### Configure HAL Client

HAL Client uses Angular HTTP Client. You have to configure HTTP Client
using dependency injection before HAL Client can be used. The modern
way of doing it using `providers` in `app.config.ts` is shown below.
The HAL Client is configured by calling `provideHalRoot()` function
with the URI of the root entry point.

```ts
import { provideHttpClient } from '@angular/common/http';
import { provideHalRoot } from "@granito/ngx-hal-client";

export const appConfig: ApplicationConfig = {
    providers: [
        provideHttpClient(),
        provideHalRoot('/api/v1')
    ]
};
```

### Define resources

Then you need to have some resources defined, e.g. the root resource for
your API hierarchy. If your root resource does not have any properties,
you can just use `Resource`. Otherwise, like in our sample API, extend
`Resource` class as needed.

```ts
import { Resource } from '@granito/ngx-hal-client';

export class ApiRoot extends Resource {
    declare apiVersion: string;
}
```

and

```ts
import { Resource } from '@granito/ngx-hal-client';

export class Message extends Resource {
    declare id: number;

    declare text: string;
}
```

Collections are represented by `Collection` resource.

### Read the root resource

HAL Client uses `Accessor` object to give access to HAL resources.
In order to access the root entry point of the API, you need to get
its accessor first using `HAL_ROOT` injection token and then read
the API root resource. Normally you would keep the root entry point
of the API as your application's state, e.g. in a `ReplaySubject`.

```ts
import { Inject, Injectable } from '@angular/core';
import { Accessor, HAL_ROOT } from '@granito/ngx-hal-client';
import { Observable, ReplaySubject } from 'rxjs';
import { ApiRoot } from './api-root';

@Injectable({ providedIn: 'root' })
export class ApiRootService {
    private readonly apiRoot$ = new ReplaySubject<ApiRoot>(1);

    get apiRoot(): Observable<ApiRoot> {
        return this.apiRoot$.asObservable();
    }

    constructor(@Inject(HAL_ROOT) private readonly halRoot: Accessor) {
        this.halRoot.read(ApiRoot)
            .subscribe(api => this.apiRoot$.next(api));
    }
}
```

### Following links

Once you have at least one resource instance, e.g. the API root from
the example above, you can follow links available in the resource to
get accessors for the linked resources.

```ts
@Injectable({ providedIn: 'root' })
export class MessageService {
    private messages$: Observable<Accessor | undefined>;

    constructor(apiRootService: ApiRootService) {
        this.messages$ = apiRootService.apiRoot.pipe(
            follow('messages')
        );
    }
}
```

In the example above, `messages$` observable will emit either the
accessor to the collection of messages or undefined if the API root
does not have `messages` link.

### CRUD operations

`Accessor` and `Resource` objects allow you to execute CRUD operations
using HAL API. Some operations are defined on both objects and work
identically, some are defined only on `Resource`, and some are available
in both but have a bit different syntax and semantic.

#### Read collection

Now that you have an accessor for the collection of messages, you can
read the collection and access its elements.

```ts
    readFirst(): Observable<Message | undefined> {
        return this.messages$.pipe(
            take(1),
            readCollection(Message),
            map(collection => collection?.values[0])
        );
    }
```

The example above shows how to access the first message in the collection
if it exists.

#### Read resource

Messages are resources, and they may have their own links. You can read resources referenced by these links as shown below.

```ts
    private current$: Observable<Message>;
    ...
    readNext(): Observable<Message> {
        return this.current$.pipe(
            take(1),
            follow('next'),
            read(Message)
        );
    }
```

The example shows how to access the next message in the thread if
it exists.

#### Refresh

The library provides `refresh()` RxJS operator to execute a read
operation on the resource using its `self` link. For example, here
is how you can refresh the API root in `ApiRootService`.

```ts
    refresh(): void {
        this.apiRoot$.pipe(
            take(1),
            refresh()
        ).subscribe(api => this.apiRoot$.next(api));
    }
```

#### Create resource

To create a new message, you can use `create()` operator.

```ts
    post(message: { text: string; }): Observable<Accessor | undefined> {
        return this.messages$.pipe(
            take(1),
            create(message)
        );
    }
```

Two things are worth mentioning here. First, the object passed to
`create()` operator does not have to be a `Resource`. Second, if the
`POST` operation returns the URI for the newly created resource
in the `Location` header, then the observable will emit an accessor
for this resource. You can use it to read the resource immediately after
it is created, e.g. by using `read()` operator.

#### Update resource

`Resource` instances can be updated in the API by using `update()`
operator. Because the resources are normally frozen, you have to use
`mutate()` operator to create a new instance and update its properties
as needed.

```ts
    private current$: Observable<Message>;
    ...
    edit(text: string): Observable<Message> {
        return this.current$.pipe(
            take(1),
            mutate(message => message.text = text),
            update()
        );
    }
```

On successful completion the observable will re-emit the mutated resource.

#### Delete resource

And finally, resources and collections can be deleted using `del()`
operator.

```ts
    private current$: Observable<Message>;
    ...
    deleteCurrent(): Observable<void> {
        return this.current$.pipe(
            take(1),
            del()
        );
    }
```

### Access embedded resources

`Resource` offers two methods to access embedded HAL resources. In order
to access embedded arrays, you can use `getArray()` method.

```ts
    array(messages: Collection<Message>): Message[] | undefined {
        return messages.getArray(Message, 'items');
    }
```

To get a single embedded object, you can use `get()` method.

```ts
    one(messages: Collection<Message>): Message | undefined {
        return messages.get(Message, 'selected');
    }
```

Note, `Collection` is a subclass of `Resource`, so both methods can be
used just fine. Also, it is worth mentioning, that using `get()` on an
embedded array will return the first element, and using `getArray()` on
a single embedded resource will return an array containing the resource.
