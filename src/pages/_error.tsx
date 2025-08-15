import { NextPageContext } from "next";
import ErrorView from "@/components/ErrorView";

function ErrorPage({ statusCode }: { statusCode?: number }) {
    return <ErrorView code={statusCode ?? 500} />;
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
    return { statusCode };
};

export default ErrorPage;
