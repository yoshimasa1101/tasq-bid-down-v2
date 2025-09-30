# tasq-bid-down-v2

GitHub Pages で公開する「商品一覧」デモ。

## ファイル構成
- index.html : 画面本体
- styles.css : デザイン
- script.js : CSV読み込みと表示処理
- auction_data.csv : 商品データ（UTF-8, ヘッダー必須）
- logs/log.csv : 任意のログファイル（不要なら削除可）

## 使い方
1. GitHub Pages を有効化（Branch: main, Folder: root）
2. 公開URLにアクセスすると商品一覧が表示されます
3. カテゴリ選択で絞り込みが可能です

## 注意
- CSV のヘッダーは `category,name,price` で統一してください
- 文字コードは UTF-8 を推奨します

