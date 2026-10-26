# OmikujiBench

オンラインおみくじ・関連サービスを比較する独立ベンチマーク。

## URL
https://omikuji-bench.pages.dev/

Cloudflare Pagesは独立プロジェクト（root: `omikuji-bench/`）として公開。`omikuji-bench/wrangler.jsonc` で `pages_build_output_dir: .` を明示し、リポジトリ直下のStatus用設定と分離。

## ブランド・デザイン
- tenmei-mori本体と同じGoogle Fonts：Zen Kaku Gothic New / Zen Old Mincho / Shippori Mincho。
- Bootstrap Icons、共通の和モダンな書体・余白・フォーカス・ライト/ダーク切替。
- 正式表記は「運勢・天命乃杜」（乃）。著作権表記はStatusと同じ「© 2026 天命乃杜」。
- 第三者サイトのロゴ・キャラクターは許諾確認なしに転載せず、独自のグラデーションSVGロゴと抽象サイトマークを使用。

## 機能
- 29サイトの検索・分類絞り込み・並べ替え・算出対象のみ表示。
- Index ランキング（棒）、体験×機能の散布図（パレート線）、カテゴリ平均、16項目マトリクス。
- 詳細評価・根拠・公式URL、CSV出力、レスポンシブ、ダークモード。

## 再確認（2026-10-26）
- 29件のうち取得できた公式ページは本文で一次確認。取得不可のものは data.js の recheck に理由を記録。
- 採点値は取得結果に合わせて修正（58項目）。根拠が見つからない項目は null（—）。

## データの扱い
- 暫定レビューは公開情報に基づく単独評価者による暫定レビュー。複数AI平均・実機試験ではない。
- 実測未実施の速度や安定性は測定値として表示しない。
- 正式評価では3つ以上のAI評価者、ブラウザ操作、LCP/INP/CLS、アクセシビリティ検証を追加する。

## 採点軸（v3.5・配点合計100）
体験・操作性22、コンテンツ品質22、機能・継続性16、透明性・安心20、デザイン・独自性8、技術配慮12。16項目の配点は evaluation-rubric.json を参照。

## ファイル
- index.html：ベンチマーク本体（描画のみ。採点は画面側で16項目から計算）
- data.js：サイト一覧・16項目の採点値・根拠の唯一の情報源
- favicon.svg / favicon-96x96.png / apple-touch-icon.png / favicon.ico：アイコン
- vendor/echarts.min.js：ECharts 6.1.0（Apache-2.0、ライセンスは vendor/ECHARTS-LICENSE.txt）
- evaluation-rubric.json：採点基準（v3.5）
- INITIAL-REVIEW.md：旧版（v1.2・21件・旧配点）の記録。現行値ではない
