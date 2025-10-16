import { supabase } from '../lib/supabaseClient'

export default function Home({ health }) {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Hello TASQ 👋</h1>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      <p>接続テスト用の最小構成です。</p>

      <section style={{ marginTop: '1rem' }}>
        <h2>接続ヘルスチェック</h2>
        <p>
          {health?.ok
            ? 'Supabase クライアント初期化 OK'
            : '環境変数が未設定か、初期化に失敗しています'}
        </p>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h2>サンプルクエリ（public スキーマ）</h2>
        <p>テーブルが未作成でもページは表示されます。</p>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          データ取得は getServerSideProps 内で行っています。
        </p>
      </section>
    </main>
  )
}

// 最小の SSR：初期化確認のみ（テーブルは不要）
export async function getServerSideProps() {
  const ok = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return { props: { health: { ok } } }
}
