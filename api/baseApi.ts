import axios from "axios";

class BaseApi {
    private baseUrl: URL;

    constructor(url: string) {
        this.baseUrl = new URL(url);
    }

    get = async <R>(path: string): Promise<R> => {
        const url = new URL(path, this.baseUrl);
        const response = await axios.get(url.toString());
        return response.data as R;
    }

    post = async <T, R>(path: string, data: T): Promise<R> => {
        const url = new URL(path, this.baseUrl);
        const response = await axios.post(url.toString(), data);
        return response.data as R;
    }
}

export default BaseApi;