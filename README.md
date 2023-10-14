# HAL Client

[![Latest Version](https://img.shields.io/npm/v/%40granito%2Fngx-hal-client.svg)](https://npm.im/@granito/ngx-hal-client)
[![Build](https://github.com/granito-source/ngx-hal-client/actions/workflows/npm-build.yaml/badge.svg)](https://github.com/granito-source/ngx-hal-client/actions/workflows/npm-build.yaml)

This is a [HAL](https://en.wikipedia.org/wiki/Hypertext_Application_Language)
client to be used in [Angular](https://angular.io/) projects.

## Installation

Using [npm](https://npmjs.org/)

```shell
$ npm install @granito/ngx-hal-client --save
```

## Building from Source

```shell
$ git clone https://github.com/granito-source/ngx-hal-client.git
$ cd ngx-hal-client
$ npm install
$ npm run build
```

### Running the Tests

```shell
$ npm tests
```

## Basic Usage

Let's assume that your application needs to work with the following
HAL API.

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
    "_links": {
        "self": {
            "href": "/api/v1/messages"
        },
        "next": {
            "href": "/api/v1/messages?start=2"
        }
    },
    "_embedded": {
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

### Add the Module

First, you need to add `HalClientModule` module to the project. It should
go directly or indirectly to all modules that will interact with the API.
For single module applications it would just go to `app.module.ts`.

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

### Define Resources

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

### Read the Root Resource

Now you can `GET` the root resource. Normally you would keep the root
entry point of the API as your application's state, e.g. in a
`ReplaySubject`. However, to simplify the examples a bit we're just
going to use an object property for that.

```ts
import { Injectable } from '@angular/core';
import { ResourceService } from '@granito/ngx-hal-client';
import { Observable, ReplaySubject } from 'rxjs';
import { ApiRoot } from './api-root';

@Injectable({ providedIn: 'root' })
export class ApiRootService {
    private readonly apiRoot$ = new ReplaySubject<ApiRoot>(1);

    get apiRoot(): Observable<ApiRoot> {
        return this.apiRoot$.asObservable();
    }

    constructor(resourceService: ResourceService) {
        resourceService.getResource(ApiRoot, '/api/v1').subscribe(
            api => this.apiRoot$.next(api));
    }
}
```

### CRUD Operations

Once you have at least one resource instance, you can execute create,
read (refresh), update, and delete operation on the linked resources
and on the resource instance itself.

#### Read Collection

In our example, the API root exposes `messages` link that represents a
collection of `Message` objects. You can read the collection by using
`readCollection()` method. The embedded data array is available as `data`
property. The example below accesses the first message in the collection.

```ts
    readFirst(): Observable<Message | undefined> {
        return this.apiRootService.apiRoot.pipe(
            take(1),
            switchMap(api => api.readCollection(Message, 'messages')),
            map(collection => collection.data[0])
        );
    }
```

#### Read Resource

Messages in the collection are also resources, and they may have their
own links. One can read resources referenced by these links like it is
shown below. In this example we access the previous in thread message.

```ts
    readPrev(message: Message): Observable<Message> {
        return message.read(Message, 'prev');
    }
```

#### Refresh

`Resource` class exposes `refresh()` convenience method to execute
a read operation on the resource using `'self'` link. For example, here
is how one can refresh the API root in `ApiRootService`.

```ts
    refresh(): void {
        this.apiRoot$.pipe(
            take(1),
            switchMap(api => api.refresh())
        ).subscribe(api => this.apiRoot$.next(api));
    }
```

#### Create Resource

To create a new message, one can use `create()` method defined on
`Resource`.

```ts
    post(message: { text: string; }): Observable<string | undefined> {
        return this.apiRootService.apiRoot.pipe(
            switchMap(api => api.create(message, 'messages'))
        );
    }
```

Two things are worth mentioning here. First, the object passed to
`create()` method does not have to be a `Resource`. Second, `rel`
parameter is optional and by default the method will use `'self'`.
This may come handy when operating directly on `Collection` resource.

#### Update Resource

`Resource` instances can be updated using `update()` method. The method
operates exclusively on `'self'` link.

```ts
    update(message: Message): Observable<void> {
        message.text = 'They call it "Le Royal Cheese".';

        return message.update();
    }
```

#### Delete Resource

And finally, `Resource` has `delete()` method allowing to delete the
instance or a linked resource. In the second case, one needs to provide
the `rel` parameter to the method.

```ts
    delete(message: Message): Observable<void> {
        return message.delete();
    }
```
