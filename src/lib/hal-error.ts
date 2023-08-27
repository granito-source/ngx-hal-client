export class HalError extends Error {
    path?: string;

    httpStatus?: number;

    [key: string]: any;

    constructor(err: any) {
        super();
        Object.assign(this, err);
        this.name = 'HalError';
    }
}
