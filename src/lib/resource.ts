interface Link {
    href: string;
}

export class Resource {
    private readonly _links: { [rel: string]: Link} = {};

    constructor(obj: any) {
        Object.assign(this, obj);
    }
}
