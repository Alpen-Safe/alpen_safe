import axios, { AxiosResponse } from "axios";

/**
 * Base class for API requests.
 * To be extended by specific API classes.
 */
class BaseApi {
    baseUrl: string;
    apiKey: string | null;
    constructor(baseUrl: string, apiKey: string | null = null) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        if (!this.baseUrl) {
            throw new Error("Base URL is required");
        }
    }

    buildHeaders = () => {
        const headers: { [key: string]: string } = {
            Accept: "application/json",
        };

        // if the api header key is different, we need to specify this is the constructor parameters as well
        // however, for now only this is useful
        if (this.apiKey) {
            headers["x-api-key"] = this.apiKey;
        }

        return headers;
    }

    /**
     * Sends a GET request to the specified path.
     * 
     * @param path - The relative URL path to send the GET request to.
     * @param responseType  - The type of response to expect from the GET request.
     * @returns - A promise that resolves with the response data from the GET request.
     */
    get = async <T>(path: string, responseType: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream' = 'json'): Promise<T> => {
        const p = new URL(path, this.baseUrl);
        const { href } = p;

        console.log('GET', href);

        let res: AxiosResponse<T> | null = null;
        try {
            res = await axios.get(href, {
                responseType: responseType,
                headers: this.buildHeaders(),
            });
        } catch (e: any) {
            console.error(`failed to get data from ${href}`, e?.response?.data?.error || e?.response?.data || e);
            throw new Error(`failed to get data from ${href}`);
        }

        if (!res) {
            throw new Error(`No response received from ${href}`);
        }
        
        // I assume non-200 here is always a success response
        const { status, data } = res;
        if (status !== 200) {
            console.log(`non-200 status code from request ${href}: ${status}`);
        }

        return data as T;
    };

    /**
     * Sends a POST request to the specified path with the provided data.
     *
     * @param path - The relative URL path to send the POST request to.
     * @param payload - The data to send in the body of the POST request.
     * @returns - A promise that resolves with the response data from the POST request.
     */
    post = async <T, R>(path: string, payload: T): Promise<R> => {
        const p = new URL(path, this.baseUrl);
        const { href } = p;

        console.log('POST', href);

        let res: AxiosResponse<R> | null = null;
        try {
            res = await axios.post(href, payload, {
                headers: this.buildHeaders(),
            });
        } catch (e: any) {
            console.error(`failed to post data to ${href}`, e?.response?.data?.error || e?.response?.data || e);
            throw new Error(`failed to post data to ${href}: ${e?.response?.data?.error || e?.response?.data}`);
        }

        if (!res) {
            throw new Error(`No response received from ${href}`);
        }
        
        // I assume non-200 here is always a success response
        const { status, data } = res;
        if (status !== 200) {
            console.log(`non-200 status code from request ${href}: ${status}`);
        }

        return data as R;
    };
};

export default BaseApi;