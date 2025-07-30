import { NextRouter } from "next/router";
import { generateSecureURL } from "./shared/secureUrlApi";
import { toast } from "react-hot-toast";

const onRouteTo = async (router: NextRouter, layout: string, company_id: number = 0) => {
    const authResp = await generateSecureURL(layout, company_id);
    if (!authResp.success) {
        toast.error(authResp.error)
        return;
    }
    router.push({ query: { auth: encodeURIComponent(authResp.url) } }, undefined, { shallow: true });
}

export {
    onRouteTo
}