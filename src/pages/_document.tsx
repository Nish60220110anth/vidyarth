import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/logo.png" />
          <link
            href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
      </Head>
      <body className="scroll-smooth antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
