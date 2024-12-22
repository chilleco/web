import Document, { Html, Head, Main, NextScript } from 'next/document';
// import Script from 'next/script';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="icon" type="image/png" href="/favicon.ico" />

          {/* Telegram Mini Apps */}
          <script src="https://telegram.org/js/telegram-web-app.js"></script>
          <script src="//cdn.jsdelivr.net/npm/eruda"></script>
          <script>eruda.init();</script>
        </Head>

        {/* Icons */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css"
          crossOrigin="anonymous"
          referrerPolicy="origin-when-cross-origin"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          integrity="sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw=="
          crossOrigin="anonymous"
          referrerPolicy="origin-when-cross-origin"
        />

        <body className="breezu">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'http://schema.org/',
                '@type': 'Organization',
                url: process.env.NEXT_PUBLIC_WEB,
                name: process.env.NEXT_PUBLIC_NAME,
                logo: `${process.env.NEXT_PUBLIC_WEB}brand/logo.png`,
                // "sameAs": [],
              }),
            }}
          />
          <Main />
          <NextScript />

          {/* Google Analytics */}
          {/* <Script
            strategy="afterInteractive" // beforeInteractive
            src="https://www.googletagmanager.com/gtag/js?id=G-5WJ60T06ZQ"
          />
          <Script
            strategy="afterInteractive" // beforeInteractive
            dangerouslySetInnerHTML={{
              __html: `
              function gtag(){dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[],gtag("js",new Date),gtag("config","G-5WJ60T06ZQ")
              `,
            }}
          /> */}
        </body>
      </Html>
    );
  }
}
