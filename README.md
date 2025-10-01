# 逆オークション（最終完成版）

## 機能
- メルカリ風UI（大画像・赤字価格・2行タイトル・最良オファーバッジ）
- 画像アップロード（Supabase Storage）
- ウォッチ数集計（全体表示／Supabase設定時）
- リアルタイム更新（responses・watchersが即時反映）
- 検索／カテゴリ・サービス絞り込み／並び替え
- 期限カウントダウン
- JSONエクスポート／インポート
- Supabase未設定時はLocalStorageで動作

## Supabase設定
1. `SUPABASE_URL` と `SUPABASE_ANON_KEY` を `script.js` に設定
2. `supabase.sql` を実行してテーブル・ポリシー・ストレージを作成
3. これで画像アップロード・ウォッチ集計・リアルタイム更新が有効化

## 注意
- Supabase未設定でもLocalStorageで動作
- DB障害時は自動でLocalStorageにフォールバック
