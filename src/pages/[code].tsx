import { GetServerSideProps } from "next";
import ErrorView from "@/components/ErrorView";

export default function ErrorByCodePage({ code, message }: { code?: number; message?: string }) {
    return <ErrorView code={code} message={message} />;
}

export const getServerSideProps: GetServerSideProps = async ({ params, query, res }) => {
    const codeNum = Number(params?.code);
    const code = Number.isFinite(codeNum) ? codeNum : undefined;
    if (code) res.statusCode = code;
    const message = typeof query.m === "string" ? query.m : undefined;
    return { props: { code: code ?? null, message: message ?? null } };
};
