/**
 * This class represents errors thrown by _Angular HAL Client_. It
 * unifies errors produced by _Angular HTTP Client_ and errors originating
 * in the API.
 */
export class HalError extends Error {
    /**
     * The URI path where the error originated.
     */
    path?: string;

    /**
     * The HTTP status code of the error.
     */
    status?: number;

    /**
     * The description of the HTTP status.
     */
    error?: string;

    /**
     * Free form error properties.
     */
    [key: string]: any;

    /**
     * @param err the object used to set properties
     */
    constructor(err: any) {
        super();
        Object.assign(this, err);
        this.name = 'HalError';
    }
}
