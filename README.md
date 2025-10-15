# Next.js + Supabase users list (minimal)

## Setup
1. Supabase で Project を作成し、`users` テーブルを用意（例: id serial, name text, username text）。
2. `.env.local` に環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx`

## Dev
```bash
npm i
npm run dev
