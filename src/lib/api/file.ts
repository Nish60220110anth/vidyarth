import axios from "axios";
import { baseUrl } from "../config";

const getFileBlobByPath = async (filePath: string) => {
    try {
        const proxyURL = `${baseUrl}/api/proxy-file?url=${encodeURIComponent(filePath)}`;
        const response = await axios.get(proxyURL, { responseType: "blob" });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        return blob;

    } catch (error) {
        console.error("Error fetching file:", error);
        throw new Error("Failed to fetch file");
    }
}

export {
    getFileBlobByPath
}