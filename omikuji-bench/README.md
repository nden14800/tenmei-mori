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
- 21サイトの検索・カテゴリ絞り込み・並べ替え・カード/表切替。
- 総合ランキング、カテゴリ平均、サイト別レーダー、カテゴリ別ヒートマップ。
- 最大4サイトのカテゴリ別比較チャート・比較表。
- 詳細評価・根拠・公式URL、CSV出力、レスポンシブ、ダークモード。

## データの扱い
- AI一次評価は公開情報に基づく単独AIの暫定レビュー。複数AI平均・実機試験ではない。
- 実測未実施の速度や安定性は測定値として表示しない。
- 正式評価では3つ以上のAI評価者、ブラウザ操作、LCP/INP/CLS、アクセシビリティ検証を追加する。

## 採点軸
体験・操作性25、結果の品質20、機能・継続性15、透明性・安心20、独自性・表現10、安定性・技術10。

## ファイル
- index.html：ベンチマーク本体
- favicon.svg：OmikujiBench独自ロゴ
- evaluation-rubric.json：採点基準
- INITIAL-REVIEW.md：候補サイトの一次レビューと根拠
