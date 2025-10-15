export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <nav style={{ display: 'flex', gap: 12 }}>
        <a href="/">ホーム</a>
        <a href="/request">リクエスト</a>
      </nav>

      <h1 style={{ marginTop: 16 }}>TASQ JAPAN</h1>
      <p>Supabase の users テーブルを表示します。</p>

      {/* クライアント側でフェッチ（匿名キーを使用） */}
      {/* SSR でやる場合は Server Actions か Route Handlers でキー管理を慎重に */}
      {/* 今回は最小構成なのでクライアントフェッチ */}
      {/* users テーブルに「まえだ」「webshop」などを投入済み前提 */}
      {/* カラムは id / name / username のどれかがあれば表示されます */}
      {/**/}
      {/* コンポーネント */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      {/* ↑lintを避けるための最小構成。実運用では削除・適切に設定 */}
      <section>
        {/* UsersList */}
        {/* 動的に読み込む必要はない最小構成 */}
        {/* 直接インポートでOK */}
      </section>
    </main>
  );
}
