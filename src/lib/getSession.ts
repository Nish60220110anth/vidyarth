
import { getIronSession } from "iron-session";
import { sessionOptions } from "./session";
import { GetServerSidePropsContext } from "next";

export async function getSession(ctx: GetServerSidePropsContext) {
    return await getIronSession(ctx.req, ctx.res, sessionOptions);
}
