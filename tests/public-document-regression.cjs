const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'tenmei-mori-backend.js'), 'utf8');

function requireText(text, message) {
  assert(html.includes(text), message);
}

assert(worker.includes('DELETE FROM summary_feedback WHERE user_email = ?'), '退会時にsummary_feedbackが削除されていません。');

function forbidText(text, message) {
  assert(!html.includes(text), message);
}

requireText(
  '制定: 2026/01/02 ・ 改定: 2026/09/26 (第32版) ・ 運営: nden148',
  'プライバシーポリシーの現行版と最終改定日がありません。'
);
requireText(
  'ゲストIDに紐づく参拝記録およびゲストプロフィールは、当サイトのサーバーにも保存されます。',
  '未ログイン履歴のサーバー保存がプライバシーポリシーに明示されていません。'
);
requireText(
  '同じゲストIDを使用できず、それまでの記録にアクセスできなくなる場合があります。',
  '端末データ消去時のゲスト記録アクセス制約が明示されていません。'
);
requireText(
  '参拝者名は結果ページや「おみくじの轍」で他の利用者に表示される場合があるため、本名や連絡先等を入力しないでください。',
  '未ログインの参拝者名が公開される可能性の注意書きがありません。'
);
requireText(
  'Googleアカウントの表示名（Googleアカウントでのログインを利用する場合のみ。初期ユーザー名の候補として使用する場合があります）',
  'Google表示名の取得・初期ユーザー名用途が第2条に明示されていません。'
);
requireText(
  'Googleアカウントのメールアドレス、GoogleユーザーID（固有の識別子）、Googleアカウントの表示名',
  'Google OAuthの送信情報が実装と一致していません。'
);
requireText(
  'Cookieおよび疑似匿名IDを用いて同一ブラウザの閲覧をセッション単位で関連付け、セッション記録およびヒートマップを生成します。',
  'Microsoft ClarityのCookie・疑似匿名ID・セッション記録・ヒートマップが明示されていません。'
);
requireText(
  'AI夢占いの夢の本文および生成解釈を含む夢の記録（dream_history）',
  '退会時のdream_history削除が第8条に明示されていません。'
);
requireText(
  '現行版：第32版（最終改定日：2026年9月26日）',
  '第9条に現行版・最終改定日がありません。'
);
requireText(
  '第9条の改定履歴を現行の第32版・改定日と一致させ、公開アーカイブとの整合を確認。',
  '第9条の選択欄から版を選ぶと、その版について確認できた実際の改定内容を表示します。本文スナップショットを確認できない版については、推測で内容を補いません。'
);
requireText(
  '退会または削除まで保存（無期限の可用性・復旧は保証しません）',
  '保存期間と可用性保証の区別が当サイトについてに反映されていません。'
);
requireText(
  '更新の内容と時期は固定せず、実施した主な変更は「更新の軌跡」および「社務所だより」でお知らせします。',
  '更新方針が固定的な旧表現から改訂されていません。'
);
requireText(
  '未ログインの場合、端末のlocalStorageに保存したゲストIDで記録を識別し、参拝記録とゲストプロフィールは当サイトのサーバーにも保存されます。',
  '使い方の参拝記録説明が実装と一致していません。'
);
requireText(
  '未ログインの記録は、端末のlocalStorageに保存したゲストIDで識別され、参拝記録とゲストプロフィールは当サイトのサーバーにも保存されます。',
  '使い方の参拝証説明が実装と一致していません。'
);
forbidText(
  '当サイトのサーバーではなくお使いの端末のローカルストレージにのみ保存されます。',
  '未ログイン履歴をlocalStorageのみとする旧記述が残っています。'
);
forbidText(
  '取得する情報はメールアドレスとGoogleが発行する固有のユーザーIDのみです。',
  'Google表示名取得と矛盾する旧記述が残っています。'
);
forbidText(
  '現時点で予定されている大規模な更新はございません。',
  '更新方針に古い固定的な表現が残っています。'
);

console.log('公開文書の整合性回帰テストに合格しました。');
console.log(JSON.stringify({
  privacyVersion: '第32版',
  guestServerStorageDisclosed: true,
  googleDisplayNameDisclosed: true,
  claritySessionTrackingDisclosed: true,
  dreamHistoryDeletionDisclosed: true,
  revisionHistoryDisclosed: true,
}, null, 2));
