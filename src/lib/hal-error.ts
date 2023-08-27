export class HalError extends Error {
    path?: string;

    status?: number;

    error?: string;

    [key: string]: any;

    constructor(err: any) {
        super();
        Object.assign(this, err);
        this.name = 'HalError';
    }
}
