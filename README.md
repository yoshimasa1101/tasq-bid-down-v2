# 逆オークション（メルカリ風UI + Supabase連携 + フォールバック）

## 概要
- メルカリ風のカードUI（大画像・赤字価格・♡ウォッチ）
- Supabase（クラウドDB）に自動接続。未設定なら localStorage にフォールバック
- 検索／カテゴリ・サービス絞り込み／並び替え／ページネーション／カウントダウン／最良オファー強調／JSON入出力

## 使い方（最短）
1. リポジトリ直下に一式を上書き
2. GitHub Pages の公開URLを開く
3. 「JSON読み込み」で `data.sample.json` を貼り付け → インポート

## Supabase を使う（任意）
- Project を作成 → Project Settings > API から
  - `SUPABASE_URL`（https://xxxx.supabase.co）
  - `SUPABASE_ANON_KEY`（anon public key）
- `script.js` の先頭に値をコピペ
- テーブルを作成（SQL）
  - requests
    ```sql
    create table if not exists public.requests (
      id bigint primary key,
      title text not null,
      category text not null,
      service text not null,
      location text,
      desc text not null,
      budget numeric not null,
      deadline date not null,
      imageUrl text,
      notes text,
      status text,
      createdAt timestamptz not null
    );
    ```
  - responses
    ```sql
    create table if not exists public.responses (
      id bigint generated always as identity primary key,
      request_id bigint not null references public.requests(id) on delete cascade,
      price numeric not null,
      comment text not null,
      eta text,
      imageUrl text,
      createdAt timestamptz not null
    );
    ```
- 以上で自動的にDBを優先使用（設定が空なら自動でLocalStorageに切替）

## 注意
- 画像URLは任意。未入力時はプレースホルダ枠表示
- 期限は `YYYY-MM-DD` または `YYYY/MM/DD` が入力可（内部でハイフンに正規化）
- DB障害時はエラーを通知しつつ LocalStorage に自動フォールバック
