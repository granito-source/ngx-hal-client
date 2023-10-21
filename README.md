# HAL Client

[![Latest Version](https://img.shields.io/npm/v/%40granito%2Fngx-hal-client.svg)](https://npm.im/@granito/ngx-hal-client)
[![Build](https://github.com/granito-source/ngx-hal-client/actions/workflows/npm-build.yaml/badge.svg)](https://github.com/granito-source/ngx-hal-client/actions/workflows/npm-build.yaml)

This is a
[Hypertext Application Language (HAL)](https://en.wikipedia.org/wiki/Hypertext_Application_Language)
client to be used in [Angular](https://angular.io/) projects.

## Installation

Using [npm](https://npmjs.org/)

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
                    }
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

### Import the module

First, you need to import `HalClientModule` module to the project.
For most applications it should go to `app.module.ts`. You don't need
to import `HttpClientModule` if you import `HalClientModule`.

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HalClientModule } from '@granito/ngx-hal-client';
...

@NgModule({
    imports: [
        BrowserModule,
        HalClientModule,
        ...
    ],
    ...
})
export class AppModule {
}
```

### Define resources

Then you need to have some resources defined, e.g. the root resource for
your API hierarchy. If your root resource does not have any properties,
you can just use `Resource`. Otherwise, like in our sample API, extend
`Resource` class as needed.

```ts
import { Resource } from '@granito/ngx-hal-client';

export class ApiRoot extends Resource {
    readonly apiVersion!: string;
}
```

and

```ts
import { Resource } from '@granito/ngx-hal-client';

export class Message extends Resource {
    id!: number;

    text!: string;
}
```

Collections are represented by `Collection` resource.

### Read the root resource

HAL Client defines `Accessor` object to give access to HAL resources.
In order to access the root entry point of the API, you need to get
its accessor first using `HalClientService` and then read the API root
resource. Normally you would keep the root entry point of the API as
your application's state, e.g. in a `ReplaySubject`.

```ts
import { Injectable } from '@angular/core';
import { HalClientService } from '@granito/ngx-hal-client';
import { Observable, ReplaySubject } from 'rxjs';
import { ApiRoot } from './api-root';

@Injectable({ providedIn: 'root' })
export class ApiRootService {
    private readonly apiRoot$ = new ReplaySubject<ApiRoot>(1);

    get apiRoot(): Observable<ApiRoot> {
        return this.apiRoot$.asObservable();
    }

    constructor(client: HalClientService) {
        client.root('/api/v1').read(ApiRoot).subscribe(
            api => this.apiRoot$.next(api));
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
            map(api => api.follow('messages'))
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
            filter(isDefined),
            switchMap(messages => messages.readCollection(Message)),
            map(collection => collection.values[0]),
            defaultIfEmpty(undefined)
        );
    }
```

The example above shows how to access the first message in the collection
if it exists.

#### Read resource

Messages in the collection are also resources, and they may have their
own links. You can read resources referenced by these links as shown
below.

```ts
    readPrev(message: Message): Observable<Message | undefined> {
        const accessor = message.follow('prev');

        return !accessor ? of(undefined) : accessor.read(Message);
    }
```

The example shows how to access the previous message in the thread if
it exists.

#### Refresh

`Resource` class defines `read()` convenience method to execute
a read operation on the resource using its `self` link. For example, here
is how you can refresh the API root in `ApiRootService`.

```ts
    refresh(): void {
        this.apiRoot$.pipe(
            take(1),
            switchMap(api => api.read())
        ).subscribe(api => this.apiRoot$.next(api));
    }
```

#### Create resource

To create a new message, you can use `create()` method defined on
`Accessor` or `Resource`.

```ts
    post(message: { text: string; }): Observable<Accessor | undefined> {
        return this.messages$.pipe(
            take(1),
            filter(isDefined),
            switchMap(messages => messages.create(message)),
            defaultIfEmpty(undefined)
        );
    }
```

Two things are worth mentioning here. First, the object passed to
`create()` method does not have to be a `Resource`. Second, if the
`POST` operation returns the URI for the newly created resource
in the `Location` header, then the observable will emit an accessor
for this resource. You can use it to read the resource immediately after
it is created, e.g. by using `switchMap()`.

#### Update resource

`Resource` instances can be updated in the API by using `update()` method.

```ts
    update(message: Message): Observable<Accessor> {
        message.text = 'They call it "Le Royal Cheese".';

        return message.update();
    }
```

On successful completion the observable will emit an accessor for the
resource, which can be used to obtain a fresh copy of it from the API.

#### Delete resource

And finally, `Resource` and `Accessor` have `delete()` method allowing
to delete the resource.

```ts
    delete(message: Message): Observable<void> {
        return message.delete();
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
