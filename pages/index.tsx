import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>TASQ JAPAN</title>
        <meta name="description" content="逆オークションMVP" />
      </Head>
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>TASQ JAPAN</h1>
        <p>逆オークションMVPへようこそ</p>
      </main>
    </>
  );
}
