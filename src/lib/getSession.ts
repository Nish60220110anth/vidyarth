
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "./session";
import { GetServerSidePropsContext } from "next";

export async function getSession(ctx: GetServerSidePropsContext) {
    return (await getIronSession<IronSessionData>(ctx.req, ctx.res, sessionOptions));
}
