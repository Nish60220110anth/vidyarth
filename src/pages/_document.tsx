import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/logo.png" />
      </Head>
      <body className="scroll-smooth antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
