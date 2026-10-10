# 外部スケジューラーによる Status 監視の保険

## 目的

GitHub Actions の `schedule` は、GitHub 側の負荷などで遅延・欠落することがあります。GitHub 以外のスケジューラーから **Status cron failsafe** を呼び出し、監視データが古い場合だけ実ブラウザ監視を再起動します。

Cloudflare Worker は追加しません。実ブラウザ確認は引き続き GitHub Actions / Playwright で実行します。

## 無料候補：cron-job.org

公式 FAQ では、無料・ジョブ数の固定上限なし・最短1分間隔と案内されています。ただし、公正利用ポリシーと実行遅延の可能性があり、完全無制限や定時実行の保証ではありません。
- FAQ: https://cron-job.org/en/faq/
- GitHub workflow_dispatch API: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

## cron-job.org の設定

1. https://cron-job.org/ でアカウントを作成し、Create cronjob を選びます。
2. URL:
   `https://api.github.com/repos/nden14800/tenmei-mori/actions/workflows/status-cron-failsafe.yml/dispatches`
3. 実行間隔：5分ごと。
4. HTTP method：`POST`
5. Headers:
   - `Accept: application/vnd.github+json`
   - `Authorization: Bearer <専用のGitHub fine-grained token>`
   - `X-GitHub-Api-Version: 2022-11-28`
   - `Content-Type: application/json`
6. Request body:
   ```json
   {"ref":"main"}
   ```
7. 保存後、cron-job.org の「Run now」相当の機能で一度実行し、GitHub Actions に **Status cron failsafe** が `workflow_dispatch` イベントとして現れることを確認します。成功時の GitHub API 応答は通常 `204 No Content` です。

## GitHub トークンの最小権限

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens で、このリポジトリだけを対象にしたトークンを作成し、Repository permissions の **Actions: Read and write** だけを付与します。トークンに期限を設定し、期限切れ前に更新してください。トークンはチャット・リポジトリ・公開ドキュメントに書かず、cron-job.org の Authorization ヘッダー設定だけに保存します。

このトークンはワークフローの起動権限を持つため、cron-job.org 側のアカウント保護とトークンの最小権限化が重要です。漏えいした場合は GitHub で直ちに失効させてください。

## 動作と制限

- 外部スケジューラーは `Status cron failsafe` だけを起動します。毎回 Playwright を実行するのではなく、既存の `health.json` が8分より古いときだけ実ブラウザ監視を dispatch します。
- 既存の GitHub `schedule` は残し、外部スケジューラーを独立した補助経路として使います。
- cron-job.org は連続失敗が続くとジョブを自動停止する場合があるため、失敗通知を有効にし、実行履歴を確認してください。
- このドキュメントをコミットしただけでは外部ジョブは作成されません。cron-job.org のアカウントと GitHub トークンが必要なので、上記の設定はリポジトリ所有者が一度だけ行う必要があります。
