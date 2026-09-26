// @ts-nocheck
/**
 * 運勢・天命乃杜 Cloudflare Workers Backend (Turso HTTP版 - 最適化・修正済)
 * 
 * 【修正内容】
 * 1. プロフィール取得時の「全件カウント」を廃止し、キャッシュ値を利用するように変更。
 *    これにより「Rows Read（読み取り行数）」の爆発的消費を防ぎます。
 * 2. データの自己修復ロジックは、数値が欠落している場合のみ実行するように制限。
 * 3. データベースへの負荷を考慮した設計に統一。
 */

// 設定定数
const ALLOWED_ORIGIN = "https://tenmei-mori.pages.dev";
const isAllowedOrigin = (candidate) => {
    if (!candidate || typeof candidate !== "string") return false;
    if (candidate === ALLOWED_ORIGIN) return true;
    try {
        const parsed = new URL(candidate);
        return parsed.protocol === "https:" && /^[a-z0-9-]{1,63}\.tenmei-mori\.pages\.dev$/i.test(parsed.hostname);
    } catch (_) {
        return false;
    }
};
const COOKIE_NAME = "tenmei_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日
const OAUTH_CONNECT_STATE_COOKIE = "tenmei_google_connect_state";
const OAUTH_CONNECT_STATE_TTL_SECONDS = 10 * 60; // 10分

// メンテナンスモード設定
const MAINTENANCE_MODE = {
    // 2026年8月29日 13:10〜13:30（JST）だけ、本番の実行要求を停止する。
    enabled: true,
    startsAt: Date.parse("2026-08-29T04:10:00Z"),
    endsAt: Date.parse("2026-08-29T04:30:00Z"),
    title: "只今、メンテナンス中です",
    message: "より安定してお参りいただける環境を整えるため、ただいま一時的に整備を行っています。",
    scheduleLabel: "2026年8月29日（土）13:10 ～ 13:30",
    retryAfterSeconds: 60
};

const isMaintenanceActive = () => {
    const now = Date.now();
    return MAINTENANCE_MODE.enabled === true
        && Number.isFinite(MAINTENANCE_MODE.startsAt)
        && Number.isFinite(MAINTENANCE_MODE.endsAt)
        && now >= MAINTENANCE_MODE.startsAt
        && now < MAINTENANCE_MODE.endsAt;
};

// パスワードハッシュ設定
// 【注意】OWASPの現行推奨値はPBKDF2-HMAC-SHA256で600,000回だが、
// Cloudflare Workers Free（CPU時間制限が短い環境）でも安全に動作するよう、
// 控えめな100,000回を採用している（無料プランで実行時間制限に達して
// ログイン・登録が失敗する事故を避けるための安全マージン）。
// Workers Paid（CPU時間の上限が高い）で運用している場合は、
// この値を 310000 や 600000 に上げるとより安全になる。
const PBKDF2_ITERATIONS = 100000;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
        const method = request.method;
        const origin = request.headers.get("Origin");

        // ---------------------------------------------------------
        // 1. CORS & Preflight (セキュリティヘッダー)
        // ---------------------------------------------------------
        const corsHeaders = {
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Guest-Id, Signature, Signature-Agent, Signature-Input",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400"
        };

        // 独立ステータスページには、状態確認に必要な読み取り専用GETだけを許可する。
        // 認証・記録・AIなどの操作APIにはCORS許可を広げない。
        const isStatusReadOnlyRequest = origin === "https://tenmei-mori-status.pages.dev"
            && method === "GET"
            && (url.pathname === "/api/system/maintenance" || url.pathname === "/api/counter");
        if (isAllowedOrigin(origin) || isStatusReadOnlyRequest) {
            corsHeaders["Access-Control-Allow-Origin"] = origin;
        }

        if (method === "OPTIONS") {
            if (!isAllowedOrigin(origin) && origin !== null) {
                return new Response("Forbidden", { status: 403 });
            }
            return new Response(null, { headers: corsHeaders });
        }

        if (origin && !isAllowedOrigin(origin) && !isStatusReadOnlyRequest) {
            return new Response(JSON.stringify({ error: "Forbidden Origin" }), { 
                status: 403, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // 【Fix③】書き込み系（GET/HEAD以外）のAPIリクエストは、Originヘッダーが
        // 一切送られていない場合も拒否する。通常のブラウザからのfetch/XHRは
        // 同一オリジンかどうかに関わらずPOST等の非単純メソッドで自動的にOriginを
        // 付与するため、正規のフロントエンド経由であればこの条件で弾かれることはない。
        // curl等でOriginヘッダーを付けずに直接APIを叩くケースだけを塞ぐための対策。
        // ※Google OAuthコールバック（GETだが外部からのリダイレクトでOriginが付かない）は対象外。
        if (!origin && method !== "GET" && method !== "HEAD" && url.pathname.startsWith("/api/")) {
            return new Response(JSON.stringify({ error: "Forbidden Origin", message: "このリクエストは許可されていません。" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // メンテナンス状態は画面表示と同じWorkerからのみ公開する。
        // この読み取り専用経路は、メンテナンス中でも案内画面を描画するためだけに残す。
        if (url.pathname === "/api/system/maintenance" && method === "GET") {
            return new Response(JSON.stringify({
                active: isMaintenanceActive(),
                title: MAINTENANCE_MODE.title,
                message: MAINTENANCE_MODE.message,
                scheduleLabel: MAINTENANCE_MODE.scheduleLabel,
                retryAfterSeconds: MAINTENANCE_MODE.retryAfterSeconds
            }), {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, max-age=0",
                    "Vary": "Origin"
                }
            });
        }

        // 表示だけではなく、Workerに届く全要求を最上流で遮断する。
        // OPTIONSは実データを返さないCORSプリフライトのため残し、GET/POST/PATCH/DELETE、
        // 直接URL、認証・AI・データ操作を含むすべての実行要求は例外なく停止する。
        if (isMaintenanceActive() && method !== "OPTIONS") {
            const retryAfter = Number.isInteger(MAINTENANCE_MODE.retryAfterSeconds)
                ? Math.max(60, MAINTENANCE_MODE.retryAfterSeconds)
                : 300;
            return new Response(JSON.stringify({
                error: "Service Unavailable",
                code: "maintenance_active",
                message: MAINTENANCE_MODE.message
            }), {
                status: 503,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, max-age=0",
                    "Retry-After": String(retryAfter),
                    "Vary": "Origin"
                }
            });
        }

        // ---------------------------------------------------------
        // 2. データベース接続ヘルパー (Turso HTTP API版)
        // ---------------------------------------------------------
        
        const toTursoArg = (val) => {
            if (val === null || val === undefined) return { type: "null", value: null };
            if (typeof val === "number") {
                return Number.isInteger(val) ? { type: "integer", value: val.toString() } : { type: "float", value: val };
            }
            if (val instanceof Uint8Array) return { type: "blob", base64: btoa(String.fromCharCode(...val)) };
            return { type: "text", value: String(val) };
        };

        const runSQL = async (sql, params = []) => {
            if (!env.TURSO_DB_URL || !env.TURSO_AUTH_TOKEN_V2) {
                throw new Error("Server Configuration Error: TURSO_DB_URL or TURSO_AUTH_TOKEN is missing.");
            }

            let endpoint = env.TURSO_DB_URL.replace("libsql://", "https://");
            if (!endpoint.startsWith("https://")) endpoint = "https://" + endpoint;
            if (!endpoint.endsWith("/v2/pipeline")) {
                endpoint = endpoint.replace(/\/$/, "") + "/v2/pipeline";
            }

            const formattedArgs = params.map(toTursoArg);
            
            const body = {
                requests: [
                    { type: "execute", stmt: { sql: sql, args: formattedArgs } },
                    { type: "close" }
                ]
            };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.TURSO_AUTH_TOKEN_V2}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`Turso API Error (${res.status}):`, errText);
                    throw new Error(`Turso DB Error (${res.status}): ${errText}`);
                }

                const json = await res.json();

                const result = json.results[0]; 
                if (result.type === "error") {
                    console.error("Turso SQL Error:", result.error);
                    throw new Error(`SQL Logic Error: ${result.error.message}`);
                }

                const queryResult = result.response.result;
                if (!queryResult) return [];

                const columns = queryResult.cols.map(c => c.name);
                const rows = queryResult.rows;

                if (!rows) return [];

                return rows.map(row => {
                    let obj = {};
                    columns.forEach((col, i) => {
                        const cell = row[i];
                        obj[col] = cell.value; 
                    });
                    return obj;
                });

            } catch (e) {
                console.error("Connection Logic Error:", e);
                throw e;
            }
        };

        // ---------------------------------------------------------
        // 3. ユーティリティ関数群
        // ---------------------------------------------------------
        
        function generateSalt() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // 【旧形式・現在は新規生成には使わない】単純なSHA-256(password+salt)。
        // 既存ユーザーの過去のハッシュを検証するためだけに残してある。
        async function hashPasswordLegacySHA256(password, salt) {
            const msgBuffer = new TextEncoder().encode(password + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // マジックリンク（ワンクリックログイン）用トークンのハッシュ化。
        // パスワードと異なり、これ自体が既に十分なエントロピーを持つ
        // ランダム文字列（推測不可能）なので、ストレッチングは不要でSHA-256で十分。
        async function sha256Hex(text) {
            const msgBuffer = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Google連携のstateは、URLに載っても認証情報にならない十分な乱数だけで構成する。
        // 連携対象のメールアドレスはstateに含めず、ハッシュ化したstateをTursoに短時間保存する。
        function createGoogleConnectState() {
            const bytes = crypto.getRandomValues(new Uint8Array(32));
            const encoded = btoa(String.fromCharCode(...bytes))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            return `connect_${encoded}`;
        }

        function makeGoogleConnectStateCookie(state, maxAge) {
            return `${OAUTH_CONNECT_STATE_COOKIE}=${state}; Path=/api/auth/google; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=None`;
        }

        function clearGoogleConnectStateCookie() {
            return `${OAUTH_CONNECT_STATE_COOKIE}=; Path=/api/auth/google; Max-Age=0; Secure; HttpOnly; SameSite=None`;
        }

        // Googleログイン用のstateパラメータに署名を付けるためのHMAC-SHA256ヘルパー。
        // Googleアカウント連携用のstateは、この署名済みペイロードではなく、上記の
        // 一回限り乱数チケットとHttpOnly Cookieの照合を使う。いずれのフローでも
        // 生のセッショントークンやメールアドレスをURLに含めない。
        async function signState(payloadJson, secret) {
            const key = await crypto.subtle.importKey(
                "raw", new TextEncoder().encode(secret || "tenmei-mori-fallback"),
                { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
            );
            const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadJson));
            return btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        // 新規登録フォームでは「8文字以上」をフロントエンドだけでチェックしていたが、
        // フロントエンドのチェックはあくまで見た目上の誘導でしかなく、直接APIを叩けば
        // 素通りしてしまう。パスワード変更（/api/user/update）に至っては
        // フロントエンド側にも長さチェックが一切無かった。
        // そのため、サーバー側で「8文字以上」を必ず検証するようにする（登録・変更共通）。
        function isValidPassword(pw) {
            return typeof pw === "string" && pw.length >= 8;
        }

        // 【マジックリンク／Googleログイン共通】
        // これまで、メールのワンクリックログインやGoogleログインが成功すると、
        // 30日間有効な「本物のセッショントークン」がそのままリダイレクト先URLの
        // クエリパラメータに載っていた（例: /?magic_login=success&token=xxxx）。
        // これはブラウザ履歴・Cloudflareのアクセスログ・共有されたURL等に
        // 長期間使えるログイン用の鍵がそのまま残ってしまう状態だった。
        // 対策として、URLには「AES-GCMで暗号化した、2分だけ有効な引換コード」だけを
        // 載せ、実際のセッショントークンはフロントエンドが /api/auth/exchange を
        // POSTで叩いて初めて受け取る方式に変更する。
        async function getAesKey(secret) {
            const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret || "tenmei-mori-fallback"));
            return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
        }
        async function encryptForUrl(payloadJson, secret) {
            const key = await getAesKey(secret);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payloadJson));
            const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(cipherBuffer), iv.length);
            return btoa(String.fromCharCode(...combined)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        async function decryptFromUrl(encoded, secret) {
            const key = await getAesKey(secret);
            const binStr = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
            const bytes = Uint8Array.from(binStr, c => c.charCodeAt(0));
            const iv = bytes.slice(0, 12);
            const cipherBytes = bytes.slice(12);
            const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
            return new TextDecoder().decode(plainBuffer);
        }
        async function makeExchangeCode(sessionToken, secret) {
            // jti（一意なコードID）を持たせることで、/api/auth/exchange 側で
            // 「このコードは既に一度使われたか」をTurso上のused_exchange_codes
            // テーブルで判定できるようにする（完全なワンタイム化）。
            const jti = crypto.randomUUID();
            const payload = JSON.stringify({ t: sessionToken, exp: Math.floor(Date.now() / 1000) + 120, jti });
            return encryptForUrl(payload, secret);
        }

        // 認証メール（コード＋マジックリンク）のHTML本文を組み立てる。
        // 【旧GAS版からの移植】以前はこのHTML生成をGoogle Apps Script側（doPost）で
        // 行い、Workerからは email/code/username/type/magicLink のみをJSONでGASへ
        // POSTしていた。GAS(MailApp)は無料枠が1日100通と少なく、上限に達すると
        // 認証メールが一切送れなくなるリスクがあったため、Brevo（1日300通・無料）
        // を経由してMaileroo（月3,000通・日次上限なし・クレカ/電話番号とも不要）へ
        // 最終的に移行し、HTML組み立てもWorker側に統合した。
        // テンプレートの内容・文言・スタイルはGAS版と完全に同一。
        function buildAuthEmailHtml(username, authCode, type, magicLink) {
            const subject = (type === 'register')
                ? "【天命乃杜】ご登録の認証コード"
                : "【天命乃杜】ログイン認証のお知らせ";

            let magicBlock = "";
            if (magicLink) {
                magicBlock = `
                    <!-- ワンクリックログイン（プライマリCTA） -->
                    <div style="text-align: center; margin-bottom: 28px;">
                      <a href="${magicLink}" target="_blank" rel="noopener"
                         style="display: inline-block; background-color: #b91c1c; color: #ffffff; text-decoration: none;
                                font-size: 16px; font-weight: bold; letter-spacing: 0.08em; padding: 16px 40px;
                                border-radius: 6px; box-shadow: 0 3px 8px rgba(185,28,28,0.3);">
                        ワンクリックでログイン
                      </a>
                      <p style="font-size: 12px; color: #999; margin: 10px 0 0;">
                        ボタンが押せない場合は、以下のURLをブラウザに貼り付けてください。<br>
                        <span style="word-break: break-all; color: #b91c1c;">${magicLink}</span>
                      </p>
                    </div>

                    <!-- 区切り線（「または」） -->
                    <div style="display: flex; align-items: center; margin: 28px 0;">
                      <div style="flex: 1; height: 1px; background-color: #e0e0e0;"></div>
                      <span style="padding: 0 14px; font-size: 12px; color: #aaa;">または</span>
                      <div style="flex: 1; height: 1px; background-color: #e0e0e0;"></div>
                    </div>

                    <p style="font-size: 14px; line-height: 1.8; margin-bottom: 20px; text-align: center;">
                      こちらの認証コードを画面に入力してもログインできます。
                    </p>
                `;
            } else {
                magicBlock = `
                    <p style="font-size: 15px; line-height: 1.8; margin-bottom: 28px;">
                      いつもご利用ありがとうございます。<br>
                      ご登録の完了に必要な認証コードをお送りします。
                    </p>
                `;
            }

            const htmlContent = `
              <div style="background-color: #f7f5f0; padding: 40px 0; font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', serif; color: #2b2b2b;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.06);">

                  <!-- 上部の赤いライン -->
                  <div style="background-color: #b91c1c; height: 4px; width: 100%;"></div>

                  <div style="padding: 40px 30px;">
                    <!-- タイトル -->
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                      <h2 style="color: #b91c1c; margin: 0; font-size: 22px; letter-spacing: 0.1em; font-weight: bold;">運勢・天命乃杜</h2>
                    </div>

                    <!-- 宛名 -->
                    <p style="font-size: 16px; margin-bottom: 20px;">${username} 様</p>

                    ${magicBlock}

                    <!-- 認証コード -->
                    <div style="background-color: #fffcf2; border: 1px solid #d4af37; border-radius: 8px; padding: 25px; margin: 10px 0 30px; text-align: center;">
                      <span style="font-size: 13px; color: #b91c1c; display: block; margin-bottom: 8px; letter-spacing: 0.05em;">認証コード</span>
                      <span style="font-size: 32px; font-weight: bold; color: #2b2b2b; letter-spacing: 0.2em;">${authCode}</span>
                    </div>

                    <!-- 注意書き -->
                    <p style="font-size: 13px; color: #666; line-height: 1.6; border-top: 1px dotted #ccc; padding-top: 15px;">
                      ※このコード・リンクの有効期限は、送信から5分間です。<br>
                      ※お心当たりがない場合は、お手数ですがこのメールを削除してください。
                    </p>

                    <!-- フッター -->
                    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #999;">
                      <p style="margin: 0;">運勢・天命乃杜 運営事務局</p>
                    </div>
                  </div>
                </div>
              </div>
            `;

            return { subject, htmlContent };
        }

        // 【新形式】PBKDF2-HMAC-SHA256でストレッチング（反復計算）を行う。
        // 保存形式: "pbkdf2$<反復回数>$<ハッシュ16進数>"
        // 先頭に "pbkdf2$" を付けることで、DBに保存された値が新形式か
        // 旧形式（裸の64文字16進数）かを後から判別できるようにしている
        // （Django等の主要フレームワークと同じ自己記述的フォーマットの考え方）。
        async function hashPasswordPBKDF2(password, salt, iterations = PBKDF2_ITERATIONS) {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
            );
            const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
                keyMaterial,
                256 // 32バイト = SHA-256と同じ出力長
            );
            const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
            return `pbkdf2$${iterations}$${hashHex}`;
        }

        // 新規パスワード作成時（新規登録・パスワード変更）はこちらを呼ぶ。
        // 常に新形式（PBKDF2）でハッシュを生成する。
        async function hashPassword(password, salt) {
            return hashPasswordPBKDF2(password, salt);
        }

        // ログイン時の検証用。保存されている形式（新形式 / 旧形式）を自動判別して検証する。
        // 戻り値: { valid: boolean, needsUpgrade: boolean }
        // 旧形式（SHA-256のみ）で検証に成功した場合は needsUpgrade=true を返すので、
        // 呼び出し側でPBKDF2形式へ自動的に書き換える（透過的なリハッシュ移行）。
        async function verifyPassword(password, salt, storedHash) {
            if (typeof storedHash === 'string' && storedHash.startsWith('pbkdf2$')) {
                const parts = storedHash.split('$');
                const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
                const candidate = await hashPasswordPBKDF2(password, salt, iterations);
                return { valid: candidate === storedHash, needsUpgrade: false };
            }
            // 旧形式（裸のSHA-256ハッシュ）として検証
            const legacyCandidate = await hashPasswordLegacySHA256(password, salt);
            const valid = legacyCandidate === storedHash;
            return { valid, needsUpgrade: valid }; // 旧形式で一致した場合のみ移行対象
        }

        function getCookie(req, name) {
            const cookieString = req.headers.get("Cookie");
            if (!cookieString) return null;
            const cookies = cookieString.split(';');
            for (let cookie of cookies) {
                const [key, value] = cookie.split('=');
                if (key.trim() === name) return value;
            }
            return null;
        }

        // 未ログイン参拝者の識別用（localStorageで発行されたUUID）
        function getGuestId(req) {
            const gid = req.headers.get("X-Guest-Id");
            if (!gid || typeof gid !== "string") return null;
            // UUID想定の簡易フォーマットチェック（不正値の混入を防ぐ）
            if (!/^[a-zA-Z0-9-]{8,64}$/.test(gid)) return null;
            return gid;
        }

        async function verifySession(req) {
            let token = getCookie(req, COOKIE_NAME);
            if (!token) {
                const authHeader = req.headers.get("Authorization");
                if (authHeader && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
            }
            if (!token) return null;
            
            try {
                // セッション確認は軽量なクエリ
                const rows = await runSQL("SELECT email FROM sessions WHERE token = ?", [token]);
                return rows.length > 0 ? { email: rows[0].email, token } : null;
            } catch (e) {
                return null;
            }
        }

        // レート制限 (Turso依存 - リスク許容版)
        // ※攻撃時にはDBのWriteを消費しますが、インフラ一本化のため許容します
        async function checkRateLimit(ip, type, limit, windowSeconds) {
            const now = Math.floor(Date.now() / 1000);
            const keyName = `${type}:${ip}`;
            const newExpire = now + windowSeconds;

            try {
                // UPDATE ... RETURNING を使い、1回の通信でカウントアップと現在値取得を行う
                let rows = await runSQL(
                    "UPDATE rate_limits SET count = count + 1 WHERE `key` = ? AND expires_at > ? RETURNING count, expires_at",
                    [keyName, now]
                );

                let currentCount;
                let expireTime;

                if (rows.length > 0) {
                    currentCount = rows[0].count;
                    expireTime = rows[0].expires_at;
                } else {
                    // 行がない、または期限切れの場合は新規挿入 (UPSERT)
                    await runSQL(
                        "INSERT INTO rate_limits (`key`, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(`key`) DO UPDATE SET count = 1, expires_at = ?",
                        [keyName, newExpire, newExpire]
                    );
                    currentCount = 1;
                    expireTime = newExpire;
                }

                if (currentCount > limit) {
                    return { allowed: false, resetTime: expireTime };
                }

                return { allowed: true, resetTime: expireTime, count: currentCount };

            } catch (e) {
                console.error("RateLimit Error:", e);
                // DBエラー時はユーザーをブロックしない（フェイルオープン）
                return { allowed: true, resetTime: newExpire };
            }
        }

        // ---------------------------------------------------------
        // 4. APIエンドポイント
        // ---------------------------------------------------------

        // 認証コード送信
        if (url.pathname === "/api/auth/send" && method === "POST") {
            try {
                const limit = 5;
                const windowSec = 60;
                const rate = await checkRateLimit(clientIP, 'auth_send', limit, windowSec);
                
                if (!rate.allowed) {
                    const now = Math.floor(Date.now() / 1000);
                    const remaining = Math.max(0, rate.resetTime - now);
                    return new Response(JSON.stringify({ 
                        error: "Too Many Requests", 
                        message: `現在の制限: 1分間に${limit}回まで\n解除まで: あと${remaining}秒\n理由: 短時間にメール送信リクエストが多すぎます。`
                    }), { status: 429, headers: corsHeaders });
                }

                let { email, username, password, mode, cf_turnstile_token } = await request.json();

                // ==========================================
                // Cloudflare Turnstile 検証
                // ==========================================
                if (!cf_turnstile_token) {
                    return new Response(JSON.stringify({ error: "セキュリティチェックが完了していません" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        secret: env.TURNSTILE_SECRET_KEY,
                        response: cf_turnstile_token,
                        remoteip: clientIP
                    })
                });
                const turnstileData = await turnstileRes.json();
                if (!turnstileData.success) {
                    return new Response(JSON.stringify({ error: "セキュリティチェックに失敗しました。もう一度お試しください。" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                // ==========================================

                email = email.toLowerCase().trim();
                let mailName = username || "参拝者";

                if (mode === 'login') {
                    const rows = await runSQL("SELECT * FROM users WHERE email = ?", [email]);
                    if (!rows.length) throw new Error("ユーザー登録されていません");
                    const user = rows[0];
                    mailName = user.username;
                    
                    const result = await verifyPassword(password, user.salt, user.password_hash);
                    if (!result.valid) throw new Error("パスワードが違います");
                } else {
                    const rows = await runSQL("SELECT email FROM users WHERE email = ?", [email]);
                    if (rows.length > 0) throw new Error("そのメールアドレスは既に登録されています");
                }

                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const now = Date.now();

                // ワンクリックログイン用のマジックリンクは「ログイン」時のみ発行する。
                // 理由: 新規登録はこの時点ではまだパスワードがDBに保存されておらず
                // （/api/auth/registerでコード検証と同時に初めて作成される）、
                // マジックリンクのクリックだけでは安全にアカウントを作成できないため。
                let magicLink = null;
                let magicTokenHash = null;
                if (mode === 'login') {
                    const magicToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
                    magicTokenHash = await sha256Hex(magicToken);
                    magicLink = `https://tenmei-mori-backend.nden14800.workers.dev/api/auth/magic-verify?token=${encodeURIComponent(magicToken)}&email=${encodeURIComponent(email)}`;
                }

                await runSQL("DELETE FROM auth_codes WHERE email = ?", [email]);
                await runSQL("INSERT INTO auth_codes (email, code, created_at, magic_token_hash) VALUES (?, ?, ?, ?)", [email, code, now, magicTokenHash]);

                // 【BrevoからMailerooへ再移行】
                // 従来はGoogle Apps Script（MailApp、無料枠1日100通）→ Brevo
                // （無料枠1日300通）の順で移行してきたが、Brevoはアカウント作成時に
                // 電話番号認証を要求するため、クレカ・電話番号とも不要な
                // Maileroo（無料枠 月3,000通・日次上限なし）へ再移行した。
                // HTML組み立てはbuildAuthEmailHtml()に統合済みでそのまま流用。
                if (env.MAILEROO_API_KEY) {
                    const { subject, htmlContent } = buildAuthEmailHtml(mailName, code, mode, magicLink);
                    ctx.waitUntil(fetch("https://smtp.maileroo.com/api/v2/emails", {
                        method: "POST",
                        headers: {
                            "accept": "application/json",
                            "X-Api-Key": env.MAILEROO_API_KEY,
                            "content-type": "application/json"
                        },
                        body: JSON.stringify({
                            from: { address: env.MAILEROO_SENDER_EMAIL, display_name: "運勢・天命乃杜" },
                            to: [{ address: email, display_name: mailName }],
                            subject,
                            html: htmlContent
                        })
                    }).then(async (r) => {
                        if (!r.ok) console.error("Maileroo Error:", r.status, await r.text());
                    }).catch(e => console.error("Maileroo Error:", e)));
                }

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
            }
        }

        // ログイン・登録検証
        if ((url.pathname === "/api/auth/login" || url.pathname === "/api/auth/register") && method === "POST") {
            try {
                const limit = 5;
                const windowSec = 60;
                const rate = await checkRateLimit(clientIP, 'auth_verify', limit, windowSec);
                
                if (!rate.allowed) {
                    const now = Math.floor(Date.now() / 1000);
                    const remaining = Math.max(0, rate.resetTime - now);
                    return new Response(JSON.stringify({ 
                        error: "Too Many Requests", 
                        message: `現在の制限: 1分間に${limit}回まで\n解除まで: あと${remaining}秒\n理由: ログイン試行回数が多すぎます。`
                    }), { status: 429, headers: corsHeaders });
                }

                let { email, password, username, code } = await request.json();
                email = email.toLowerCase().trim();
                const isLogin = url.pathname.includes("login");

                const codes = await runSQL("SELECT * FROM auth_codes WHERE email = ?", [email]);
                if (!codes.length || codes[0].code !== code || (Date.now() - codes[0].created_at > 300000)) {
                    return new Response(JSON.stringify({ success: false, message: "認証コードが無効か期限切れです" }), { status: 401, headers: corsHeaders });
                }

                if (isLogin) {
                    // ログイン時は人数を増やさない
                    const users = await runSQL("SELECT * FROM users WHERE email = ?", [email]);
                    if (!users.length) return new Response(JSON.stringify({ success: false, message: "ユーザーが見つかりません" }), { status: 404, headers: corsHeaders });
                    const user = users[0];
                    const result = await verifyPassword(password, user.salt, user.password_hash);
                    if (!result.valid) return new Response(JSON.stringify({ success: false, message: "パスワード不一致" }), { status: 401, headers: corsHeaders });
                    username = user.username;
                    // 旧形式（ソルト付きSHA-256のみ）のハッシュで検証に成功した場合、
                    // ログインできた今このタイミングで平文パスワードがわかっているので、
                    // 透過的にPBKDF2形式へ書き換える（ユーザー操作・通知は不要）
                    if (result.needsUpgrade) {
                        const upgradedHash = await hashPassword(password, user.salt);
                        ctx.waitUntil(runSQL("UPDATE users SET password_hash = ? WHERE email = ?", [upgradedHash, email]).catch(e => console.error("Password upgrade failed:", e)));
                    }
                } else {
                    // 【重要】ここが新規登録（一度きり）の処理

                    // パスワードの強度チェック（8文字以上）。フロントエンドの
                    // チェックはバイパス可能なため、サーバー側でも必ず検証する。
                    if (!isValidPassword(password)) {
                        return new Response(JSON.stringify({ success: false, message: "パスワードは8文字以上で入力してください。" }), { status: 400, headers: corsHeaders });
                    }

                    // 【Fix④】ユーザー名のバリデーション
                    const trimmedUsername = String(username || "").trim();
                    if (trimmedUsername.length < 1 || trimmedUsername.length > 20 || /[\u0000-\u001F\u007F]/.test(trimmedUsername)) {
                        return new Response(JSON.stringify({ success: false, message: "ユーザー名は1〜20文字で、使用できない文字が含まれていないか確認してください。" }), { status: 400, headers: corsHeaders });
                    }
                    // 【Fix⑤】ユーザー名の重複チェック
                    const dupRows = await runSQL("SELECT email FROM users WHERE username = ?", [trimmedUsername]);
                    if (dupRows.length > 0) {
                        return new Response(JSON.stringify({ success: false, message: "そのユーザー名は既に使用されています。" }), { status: 409, headers: corsHeaders });
                    }
                    username = trimmedUsername;

                    const salt = generateSalt();
                    const passHash = await hashPassword(password, salt);
                    await runSQL("INSERT INTO users (email, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)", [email, username, passHash, salt, Date.now()]);
                    await runSQL("INSERT INTO user_profiles (user_email, title, icon_type, icon_color, created_at, total_draws, daikichi_count) VALUES (?, '初詣の旅人', 'bi-person', 'gray', ?, 0, 0)", [email, Date.now()]);
                    
                    // ★【修正】このタイミングだけ、累計参拝者数を +1 する
                    await runSQL("UPDATE counter SET user_count = user_count + 1 WHERE id = 1");
                }
        
                // セッション発行処理 (既存のまま)
                const token = crypto.randomUUID();
                await runSQL("INSERT INTO sessions (token, email, created_at) VALUES (?, ?, ?)", [token, email, Date.now()]);
                await runSQL("DELETE FROM auth_codes WHERE email = ?", [email]);
                const cookie = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=None`;
                
                return new Response(JSON.stringify({ success: true, username, token }), { 
                    headers: { ...corsHeaders, "Content-Type": "application/json", "Set-Cookie": cookie } 
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
            }
        }

        // マジックリンク（メール内のワンクリックログインURL）検証
        // Googleコールバックと同じ「サーバー側でリダイレクト＋Cookie発行」方式を採用。
        // ブラウザでリンクを直接開く(GET)ことを想定しているため、
        // 結果はJSONではなくフロントエンドへのリダイレクトで返す。
        if (url.pathname === "/api/auth/magic-verify" && method === "GET") {
            const frontendUrl = ALLOWED_ORIGIN;
            try {
                const token = url.searchParams.get("token") || "";
                const email = (url.searchParams.get("email") || "").toLowerCase().trim();
                if (!token || !email) {
                    return Response.redirect(`${frontendUrl}/?magic_login=error&reason=invalid`, 302);
                }

                const codes = await runSQL("SELECT * FROM auth_codes WHERE email = ?", [email]);
                if (!codes.length || !codes[0].magic_token_hash) {
                    return Response.redirect(`${frontendUrl}/?magic_login=error&reason=invalid`, 302);
                }
                if (Date.now() - codes[0].created_at > 300000) {
                    return Response.redirect(`${frontendUrl}/?magic_login=error&reason=expired`, 302);
                }

                const tokenHash = await sha256Hex(token);
                if (tokenHash !== codes[0].magic_token_hash) {
                    return Response.redirect(`${frontendUrl}/?magic_login=error&reason=invalid`, 302);
                }

                const users = await runSQL("SELECT username FROM users WHERE email = ?", [email]);
                if (!users.length) {
                    return Response.redirect(`${frontendUrl}/?magic_login=error&reason=user_not_found`, 302);
                }

                // ワンタイム使用: 検証成功と同時に認証コード自体も無効化する
                await runSQL("DELETE FROM auth_codes WHERE email = ?", [email]);

                const sessionToken = crypto.randomUUID();
                await runSQL("INSERT INTO sessions (token, email, created_at) VALUES (?, ?, ?)", [sessionToken, email, Date.now()]);
                const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=None`;
                const exchangeCode = await makeExchangeCode(sessionToken, env.GOOGLE_CLIENT_SECRET);

                return new Response(null, {
                    status: 302,
                    headers: {
                        ...corsHeaders,
                        "Location": `${frontendUrl}/?magic_login=success&code=${encodeURIComponent(exchangeCode)}`,
                        "Set-Cookie": cookie
                    }
                });
            } catch (e) {
                console.error("Magic verify error:", e);
                return Response.redirect(`${frontendUrl}/?magic_login=error&reason=server_error`, 302);
            }
        }

        // マジックリンク／Googleログインのリダイレクト直後に、フロントエンドが
        // URL中の暗号化コードを実際のセッショントークンと引き換えるためのAPI。
        // コードは2分だけ有効で、それを過ぎると解読できても失敗させる。
        if (url.pathname === "/api/auth/exchange" && method === "POST") {
            try {
                const { code } = await request.json();
                if (!code) {
                    return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                let payload;
                try {
                    const json = await decryptFromUrl(code, env.GOOGLE_CLIENT_SECRET);
                    payload = JSON.parse(json);
                } catch (e) {
                    return new Response(JSON.stringify({ error: "invalid_or_expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                if (!payload.t || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
                    return new Response(JSON.stringify({ error: "expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                // 【ワンタイム化】このコード（jti）が既に使用済みかをTursoで判定する。
                // used_exchange_codes に code_id（jti）をPRIMARY KEYとしてINSERTし、
                // 既に同じjtiが存在すればUNIQUE制約違反となるため「使用済み」と判断できる。
                // これにより、2分の有効期限内であっても同じコードを2回目以降は使えなくなる。
                if (!payload.jti) {
                    return new Response(JSON.stringify({ error: "invalid_or_expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                try {
                    // ついでに期限切れの古いレコードを間引く（テーブル肥大化防止、失敗しても無視）
                    runSQL("DELETE FROM used_exchange_codes WHERE expires_at < ?", [Math.floor(Date.now() / 1000)]).catch(() => {});
                    await runSQL(
                        "INSERT INTO used_exchange_codes (code_id, expires_at) VALUES (?, ?)",
                        [payload.jti, payload.exp]
                    );
                } catch (e) {
                    // UNIQUE制約違反 = このコードは既に使用済み
                    if (String(e.message).includes("UNIQUE constraint")) {
                        return new Response(JSON.stringify({ error: "already_used" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }
                    throw e;
                }

                return new Response(JSON.stringify({ success: true, token: payload.t }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/auth/logout" && method === "POST") {
            const session = await verifySession(request);
            if (session) {
                await runSQL("DELETE FROM sessions WHERE token = ?", [session.token]);
            }
            const cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=None`;
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Set-Cookie": cookie } });
        }

        if (url.pathname === "/api/auth/check" && method === "GET") {
            const session = await verifySession(request);
            if (session) {
                const rows = await runSQL("SELECT username FROM users WHERE email = ?", [session.email]);
                if(rows.length) {
                    return new Response(JSON.stringify({ loggedIn: true, username: rows[0].username, email: session.email, token: session.token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
            } 
            return new Response(JSON.stringify({ loggedIn: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (url.pathname === "/api/counter" && method === "GET") {
            try {
                const rows = await runSQL("SELECT count, user_count FROM counter WHERE id = 1");
                const data = rows[0] || { count: 0, user_count: 0 };
                return new Response(JSON.stringify({ 
                    count: Number(data.count),
                    userCount: Number(data.user_count) // ここを userCount で統一
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ count: 0, userCount: 0 }), { headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/stats" && method === "GET") {
            try {
                const results = await runSQL("SELECT result, count FROM stats");
                
                const revMap = { "大吉": "daikichi", "中吉": "chukichi", "小吉": "shokichi", "吉": "kichi", "半吉": "hankichi", "末吉": "suekichi", "末小吉": "sueshokichi", "凶": "kyo", "小凶": "shokyo", "半凶": "hankyo", "末凶": "suekyo", "大凶": "daikyo" };
                let stats = {}, total = 0;
                
                results.forEach(r => {
                    const k = revMap[r.result];
                    const val = Number(r.count);
                    if (k) { stats[k] = val; total += val; }
                });

                return new Response(JSON.stringify({ 
                    stats: stats, 
                    counts: stats, 
                    total, 
                    timestamp: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) 
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ stats: {}, total: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }


// ==========================================
        // 【修正版】おみくじAPI (レート制限実装済み)
        // ==========================================
        if (url.pathname === "/api/draw" && method === "POST") {
            try {
                // ▼▼▼ 追加: レート制限チェック (1分間に60回) ▼▼▼
                const limit = 60; 
                const windowSec = 60;
                const rate = await checkRateLimit(clientIP, 'draw', limit, windowSec);

                if (!rate.allowed) {
                    const now = Math.floor(Date.now() / 1000);
                    const remaining = Math.max(0, rate.resetTime - now);
                    return new Response(JSON.stringify({ 
                        error: "Too Many Requests", 
                        message: `現在の制限: 1分間に${limit}回まで\n解除まで: あと${remaining}秒\n深呼吸をして、時が満ちるのをお待ちください。`
                    }), { status: 429, headers: corsHeaders });
                }
                // ▲▲▲ 追加ここまで ▲▲▲

                const body = await request.json();
                const session = await verifySession(request);
                const guestId = session ? null : getGuestId(request);

                // 1. カウンターを先に更新して、今回の番号を取得する
                await runSQL("UPDATE counter SET count = count + 1 WHERE id = 1");
                const cRows = await runSQL("SELECT count FROM counter WHERE id = 1");
                const currentTotal = Number(cRows[0].count);

                // 2. 全体統計更新
                await runSQL(`INSERT INTO stats (result, count) VALUES (?, 1) ON CONFLICT(result) DO UPDATE SET count = count + 1`, [body.result]);

                const isDaikichi = (body.result === '大吉' ? 1 : 0);

                if (session) {
                    const uRows = await runSQL("SELECT username FROM users WHERE email = ?", [session.email]);
                    const username = uRows[0].username;
                    
                    // 3. 履歴保存 (確定番号を保存)
                    await runSQL("INSERT INTO history (username, result, poem, detail, lucky, unlucky, timestamp, issue_number, guest_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)", 
                        [username, body.result, body.poem, JSON.stringify(body.detail), JSON.stringify(body.lucky), JSON.stringify(body.unlucky), Date.now(), currentTotal]);
                    
                    // 4. 個人統計(UPSERT)
                    await runSQL(`
                        INSERT INTO user_profiles (user_email, total_draws, daikichi_count, updated_at)
                        VALUES (?, 1, ?, ?)
                        ON CONFLICT(user_email) DO UPDATE SET
                        total_draws = total_draws + 1,
                        daikichi_count = daikichi_count + ?,
                        updated_at = ?
                    `, [session.email, isDaikichi, Date.now(), isDaikichi, Date.now()]);
                } else if (guestId) {
                    // 未ログイン参拝者（ゲスト）：クライアント側で設定済みの参拝者名を使用
                    const guestName = (typeof body.username === 'string' && body.username.trim())
                        ? body.username.trim().slice(0, 20)
                        : "ゲスト参拝者";

                    // 3. 履歴保存（guest_idで紐付け。登録会員のusernameとの衝突を避けるため区別する）
                    await runSQL("INSERT INTO history (username, result, poem, detail, lucky, unlucky, timestamp, issue_number, guest_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [guestName, body.result, body.poem, JSON.stringify(body.detail), JSON.stringify(body.lucky), JSON.stringify(body.unlucky), Date.now(), currentTotal, guestId]);

                    // 4. ゲスト個人統計(UPSERT)
                    await runSQL(`
                        INSERT INTO guest_profiles (guest_id, username, total_draws, daikichi_count, created_at, updated_at)
                        VALUES (?, ?, 1, ?, ?, ?)
                        ON CONFLICT(guest_id) DO UPDATE SET
                        username = ?,
                        total_draws = total_draws + 1,
                        daikichi_count = daikichi_count + ?,
                        updated_at = ?
                    `, [guestId, guestName, isDaikichi, Date.now(), Date.now(), guestName, isDaikichi, Date.now()]);
                }
                // session も guestId もない場合（参拝者名を未設定のまま強制送信された等）は
                // 全体カウンターのみ反映し、個人の履歴・統計には残さない

                return new Response(JSON.stringify({ success: true, count: currentTotal }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders }); }
        }

        if (url.pathname === "/api/history" && method === "GET") {
            try {
                const session = await verifySession(request);
                const guestId = session ? null : getGuestId(request);
                if (!session && !guestId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                let rows;
                if (session) {
                    const uRows = await runSQL("SELECT username FROM users WHERE email = ?", [session.email]);
                    const username = uRows.length ? uRows[0].username : "";
                    // guest_id IS NULL: ゲストが同名を名乗った場合に登録会員の履歴へ混入するのを防ぐ
                    rows = await runSQL("SELECT * FROM history WHERE username = ? AND guest_id IS NULL ORDER BY timestamp DESC LIMIT 100", [username]);
                } else {
                    rows = await runSQL("SELECT * FROM history WHERE guest_id = ? ORDER BY timestamp DESC LIMIT 100", [guestId]);
                }
                
                const history = rows.map(row => ({
                    ...row,
                    detail: JSON.parse(row.detail),
                    lucky: JSON.parse(row.lucky),
                    unlucky: JSON.parse(row.unlucky)
                }));

                return new Response(JSON.stringify({ history }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/history/global" && method === "GET") {
            try {
                const params = new URL(request.url).searchParams;
                
                const session = await verifySession(request);
                const guestId = session ? null : getGuestId(request);

                let username = "";
                if (session) {
                    const uRows = await runSQL("SELECT username FROM users WHERE email = ?", [session.email]);
                    username = uRows.length ? uRows[0].username : "";
                }

                const page = parseInt(params.get("page") || "1");
                const limit = 100;
                const offset = (page - 1) * limit;

                let sql = "SELECT * FROM history";
                let countSql = "SELECT COUNT(*) as cnt FROM history";
                let whereClauses = [];
                let queryParams = [];

                if (params.get("type") && params.get("type") !== 'all') {
                    whereClauses.push("result = ?");
                    queryParams.push(params.get("type"));
                }
                if (params.get("keyword")) {
                    whereClauses.push("username LIKE ?");
                    queryParams.push(`%${params.get("keyword")}%`);
                }
                if (params.get("dateStart")) {
                    const startTs = new Date(params.get("dateStart")).setHours(0,0,0,0);
                    if(!isNaN(startTs)) {
                        whereClauses.push("timestamp >= ?");
                        queryParams.push(startTs);
                    }
                }
                if (params.get("dateEnd")) {
                    const endTs = new Date(params.get("dateEnd")).setHours(23,59,59,999);
                    if(!isNaN(endTs)) {
                        whereClauses.push("timestamp <= ?");
                        queryParams.push(endTs);
                    }
                }

                if (whereClauses.length > 0) {
                    const whereStr = " WHERE " + whereClauses.join(" AND ");
                    sql += whereStr;
                    countSql += whereStr;
                }

                sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
                
                const rows = await runSQL(sql, [...queryParams, limit, offset]);
                const countRows = await runSQL(countSql, queryParams);
                const totalItems = Number(countRows[0].cnt);

                // 個人の全件数もプロフィールテーブルから取れるならその方が良いが、
                // ここでは検索機能の一部なのでCOUNT(*)を使わざるを得ない場合もある。
                // ただし、頻繁に叩かれるエンドポイントではないので許容範囲。
                let pCountRows;
                if (session) {
                    pCountRows = await runSQL("SELECT COUNT(*) as cnt FROM history WHERE username = ? AND guest_id IS NULL", [username]);
                } else if (guestId) {
                    pCountRows = await runSQL("SELECT COUNT(*) as cnt FROM history WHERE guest_id = ?", [guestId]);
                } else {
                    pCountRows = [{ cnt: 0 }];
                }
                const personalTotal = Number(pCountRows[0].cnt);

                const globalHistory = rows.map(row => ({
                    ...row,
                    detail: JSON.parse(row.detail),
                    lucky: JSON.parse(row.lucky),
                    unlucky: JSON.parse(row.unlucky)
                }));

                return new Response(JSON.stringify({ 
                    global: globalHistory, 
                    personalTotal: personalTotal,
                    totalItems, 
                    page, 
                    perPage: limit 
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/favorites") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                
                if (method === "GET") {
                    const rows = await runSQL("SELECT data FROM favorites WHERE email = ?", [session.email]);
                    return new Response(JSON.stringify({ favorites: rows.length ? JSON.parse(rows[0].data) : [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                } else {
                    const { favorites } = await request.json();
                    await runSQL("INSERT INTO favorites (email, data) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET data = ?", [session.email, JSON.stringify(favorites), JSON.stringify(favorites)]);
                    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/user/settings") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                if (method === "GET") {
                    const rows = await runSQL("SELECT data FROM settings WHERE email = ?", [session.email]);
                    return new Response(JSON.stringify({ settings: rows.length ? JSON.parse(rows[0].data) : {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                } else {
                    const { settings } = await request.json();
                    await runSQL("INSERT INTO settings (email, data) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET data = ?", [session.email, JSON.stringify(settings), JSON.stringify(settings)]);
                    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/user/search" && method === "GET") {
            try {
                // 【Fix⑦】ユーザー名の総当たり列挙を抑止するためのレート制限
                const searchRate = await checkRateLimit(clientIP, "user_search", 30, 60); // 1分間30回まで
                if (!searchRate.allowed) {
                    return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
                }

                const query = new URL(request.url).searchParams.get("q");
                let sql = `
                    SELECT u.username, p.verified_type, p.icon_type, p.icon_color 
                    FROM users u 
                    LEFT JOIN user_profiles p ON u.email = p.user_email
                `;
                let params = [];
                
                if (query) {
                    sql += " WHERE u.username LIKE ? LIMIT 5";
                    params.push(`%${query}%`);
                } else {
                    sql += " ORDER BY u.created_at DESC LIMIT 5";
                }
                
                const rows = await runSQL(sql, params);
                
                const results = rows.map(u => ({
                    username: u.username,
                    verified_type: u.verified_type || 'none',
                    icon_type: u.icon_type || 'bi-person',
                    icon_color: u.icon_color || 'gray'
                }));

                return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            } 
 }


if (url.pathname === "/api/user/profile" && method === "GET") {
    try {
        const targetUsername = new URL(request.url).searchParams.get("username");
        const uRows = await runSQL("SELECT email, username FROM users WHERE username = ?", [targetUsername]);
        if (!uRows.length) return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
        const email = uRows[0].email;

        // 1. 全体の累計登録者数を取得 (取得のみ！更新しない)
        const cRows = await runSQL("SELECT user_count FROM counter WHERE id = 1");
        const totalUsers = cRows.length ? Number(cRows[0].user_count) : 1;

        // 2. 個人の統計と全体合計を取得
        const personalRows = await runSQL("SELECT result, COUNT(*) as cnt FROM history WHERE username = ? AND guest_id IS NULL GROUP BY result", [targetUsername]);
        const globalStatsRows = await runSQL("SELECT result, count FROM stats");

        const fortunes = ["大吉", "中吉", "小吉", "吉", "半吉", "末吉", "末小吉", "凶", "小凶", "半凶", "末凶", "大凶"];
        let userStats = {};
        let averageStats = {};
        let userTotal = 0;
        fortunes.forEach(f => { userStats[f] = 0; averageStats[f] = 0; });

        personalRows.forEach(row => {
            userStats[row.result] = Number(row.cnt);
            userTotal += Number(row.cnt);
        });

        globalStatsRows.forEach(row => {
            if (averageStats.hasOwnProperty(row.result)) {
                // 平均 = 全体の合計 / 登録者数
                averageStats[row.result] = parseFloat((Number(row.count) / totalUsers).toFixed(2));
            }
        });

        return new Response(JSON.stringify({
            stats: {
                totalDraws: userTotal,
                userFortunes: userStats,
                averageFortunes: averageStats,
                totalUsers: totalUsers
            }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch(e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
}

// 未ログイン参拝者（ゲスト）自身の統計。X-Guest-Idヘッダーからのみ本人特定するため、
// クエリパラメータでの他人指定はできない（/api/user/profileとは異なりURLで晒さない）
if (url.pathname === "/api/guest/profile" && method === "GET") {
    try {
        const guestId = getGuestId(request);
        if (!guestId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const cRows = await runSQL("SELECT user_count FROM counter WHERE id = 1");
        const totalUsers = cRows.length ? Number(cRows[0].user_count) : 1;

        const personalRows = await runSQL("SELECT result, COUNT(*) as cnt FROM history WHERE guest_id = ? GROUP BY result", [guestId]);
        const globalStatsRows = await runSQL("SELECT result, count FROM stats");

        const fortunes = ["大吉", "中吉", "小吉", "吉", "半吉", "末吉", "末小吉", "凶", "小凶", "半凶", "末凶", "大凶"];
        let userStats = {};
        let averageStats = {};
        let userTotal = 0;
        fortunes.forEach(f => { userStats[f] = 0; averageStats[f] = 0; });

        personalRows.forEach(row => {
            userStats[row.result] = Number(row.cnt);
            userTotal += Number(row.cnt);
        });

        globalStatsRows.forEach(row => {
            if (averageStats.hasOwnProperty(row.result)) {
                averageStats[row.result] = parseFloat((Number(row.count) / totalUsers).toFixed(2));
            }
        });

        return new Response(JSON.stringify({
            stats: {
                totalDraws: userTotal,
                userFortunes: userStats,
                averageFortunes: averageStats,
                totalUsers: totalUsers
            }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch(e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
}

// ★New!24: 今日は何の日（whatistoday.cyou APIをTursoに日次キャッシュして返す）
if (url.pathname === "/api/today-anniv" && method === "GET") {
    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const todayKey = `${mm}${dd}`; // mmdd
        const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;

        const cacheRows = await runSQL("SELECT date_key, data FROM today_anniv_cache WHERE id = 1");
        const cachedItemsToday = (cacheRows.length && cacheRows[0].date_key === todayKey)
            ? JSON.parse(cacheRows[0].data) : null;
        // 日付が一致していても中身が空（＝過去の取得失敗の記録）の場合は
        // キャッシュを信用せず、下でAPIへ再取得しにいく（自己修復させる）
        if (cachedItemsToday && cachedItemsToday.length > 0) {
            return new Response(JSON.stringify({
                dateLabel, items: cachedItemsToday, cached: true
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        let items = [];
        try {
            // v2は{_count,_items:[{...}]}のようにネストされた構造を返すため、
            // トップレベルにanniv1〜anniv5がフラットに並ぶv3を使用する
            const apiRes = await fetch(`https://api.whatistoday.cyou/v3/anniv/${todayKey}`);
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                items = Object.keys(apiData)
                    .filter(k => /^anniv\d+$/.test(k) && apiData[k])
                    .sort()
                    .map(k => apiData[k]);
            }
        } catch (apiErr) { /* APIが落ちていてもキャッシュがあれば下でフォールバック */ }

        if (items.length === 0 && cacheRows.length) {
            // API失敗時は古いキャッシュでもいったん返す（表示を空にしないため）
            return new Response(JSON.stringify({
                dateLabel, items: JSON.parse(cacheRows[0].data), cached: true, stale: true
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await runSQL(`
            INSERT INTO today_anniv_cache (id, date_key, data) VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET date_key = ?, data = ?
        `, [todayKey, JSON.stringify(items), todayKey, JSON.stringify(items)]);

        return new Response(JSON.stringify({ dateLabel, items }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ items: [], error: e.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}

        if (url.pathname === "/api/user/update_details" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                
                const { bio, title, icon, color, banner } = await request.json();
                const hasInvalidControlCharacter = (value) => /[ -]/.test(value);
                const allowedIcons = new Set(['bi-person', 'bi-flower1', 'bi-star', 'bi-heart', 'bi-moon-stars', 'bi-sun', 'bi-sun-fill', 'bi-tree', 'bi-cloud', 'bi-droplet', 'bi-lightning', 'bi-clipboard-check-fill', 'bi-gem', 'bi-fire', 'bi-snow']);
                const allowedColors = new Set(['gray', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'black']);
                const normalizedBio = typeof bio === 'string' ? bio.trim() : '';
                const normalizedTitle = typeof title === 'string' ? title.trim() : '初詣の旅人';
                const normalizedIcon = typeof icon === 'string' ? icon : 'bi-person';
                const normalizedColor = typeof color === 'string' ? color : 'gray';
                const normalizedBanner = typeof banner === 'string' && banner.length <= 32 && !hasInvalidControlCharacter(banner) ? banner : 'default';

                if (normalizedBio.length > 500 || hasInvalidControlCharacter(normalizedBio) || !normalizedTitle || normalizedTitle.length > 40 || hasInvalidControlCharacter(normalizedTitle) || !allowedIcons.has(normalizedIcon) || !allowedColors.has(normalizedColor)) {
                    return new Response(JSON.stringify({ error: 'プロフィール入力の形式をご確認ください。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                
                await runSQL(`
                    INSERT INTO user_profiles (user_email, bio, title, icon_type, icon_color, banner_type, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?) 
                    ON CONFLICT(user_email) DO UPDATE SET bio=?, title=?, icon_type=?, icon_color=?, banner_type=?, updated_at=?
                `, [
                    session.email, normalizedBio, normalizedTitle, normalizedIcon, normalizedColor, normalizedBanner, Date.now(),
                    normalizedBio, normalizedTitle, normalizedIcon, normalizedColor, normalizedBanner, Date.now()
                ]);
                
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/user/update" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                const { newUsername, newPassword, currentPassword } = await request.json();

                // 【Fix④】ユーザー名のバリデーション（空文字・長すぎ・制御文字を拒否）
                if (newUsername !== undefined && newUsername !== null) {
                    const trimmedName = String(newUsername).trim();
                    if (trimmedName.length < 1 || trimmedName.length > 20 || /[\u0000-\u001F\u007F]/.test(trimmedName)) {
                        return new Response(JSON.stringify({ error: "ユーザー名は1〜20文字で、使用できない文字が含まれていないか確認してください。" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }

                    // 【Fix⑤】ユーザー名の重複チェック（自分自身は除く）
                    const dupRows = await runSQL("SELECT email FROM users WHERE username = ? AND email != ?", [trimmedName, session.email]);
                    if (dupRows.length > 0) {
                        return new Response(JSON.stringify({ error: "そのユーザー名は既に使用されています。" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }

                    await runSQL("UPDATE users SET username = ? WHERE email = ?", [trimmedName, session.email]);
                }

                if (newPassword) {
                    // パスワードの強度チェック（8文字以上）。新規登録と同じ基準で、
                    // 「67」のような極端に短いパスワードへの変更をサーバー側で拒否する。
                    if (!isValidPassword(newPassword)) {
                        return new Response(JSON.stringify({ error: "パスワードは8文字以上で入力してください。" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }

                    // 【Fix①】パスワード変更時は、現在のパスワードが一致することを必ず確認する。
                    // これが無いと、セッションCookieが盗まれただけで本人を締め出す形でパスワードを
                    // 書き換えられてしまうため。
                    const rows = await runSQL("SELECT salt, password_hash FROM users WHERE email = ?", [session.email]);
                    if (!rows.length) {
                        return new Response(JSON.stringify({ error: "ユーザーが見つかりません。" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }
                    if (!currentPassword) {
                        return new Response(JSON.stringify({ error: "現在のパスワードを入力してください。" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }
                    const verifyResult = await verifyPassword(currentPassword, rows[0].salt, rows[0].password_hash);
                    if (!verifyResult.valid) {
                        return new Response(JSON.stringify({ error: "現在のパスワードが正しくありません。" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                    }

                    const hash = await hashPassword(newPassword, rows[0].salt);
                    await runSQL("UPDATE users SET password_hash = ? WHERE email = ?", [hash, session.email]);
                }

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ==========================================
        // 【修正版】アカウント削除API (カウンター減算なし・ヘッダー修正済)
        // ==========================================
        if (url.pathname === "/api/user/delete" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

                const email = session.email;
                
                // 1. ユーザー名の取得 (存在チェックを追加してクラッシュを防止)
                const uRows = await runSQL("SELECT username FROM users WHERE email = ?", [email]);
                
                // ユーザーが存在する場合、ユーザー名に紐づくデータを削除
                if (uRows.length > 0) {
                    const username = uRows[0].username;
                    await runSQL("DELETE FROM history WHERE username = ?", [username]);
                    // 掲示板機能がある場合はここに追加
                    // await runSQL("DELETE FROM board_posts WHERE username = ?", [username]); 
                }

                // 2. メールアドレスに紐づくデータを無条件で削除
                // 夢の本文とAI解釈は私的な内容を含み得るため、退会時に必ず削除する。
                await runSQL("DELETE FROM dream_history WHERE user_email = ?", [email]);
                await runSQL("DELETE FROM user_profiles WHERE user_email = ?", [email]);
                await runSQL("DELETE FROM goshuin WHERE user_email = ?", [email]);
                await runSQL("DELETE FROM favorites WHERE email = ?", [email]);
                await runSQL("DELETE FROM settings WHERE email = ?", [email]);
                await runSQL("DELETE FROM sessions WHERE email = ?", [email]);
                await runSQL("DELETE FROM auth_codes WHERE email = ?", [email]);
                await runSQL("DELETE FROM verification_requests WHERE user_email = ?", [email]);
                await runSQL("DELETE FROM users WHERE email = ?", [email]);
                
                // ★修正: ここにあった「counterを減らす処理」を削除しました。
                // 「累計参拝者数」は歴史的記録として、退会しても減らしません。

                const cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=None`;
                return new Response(JSON.stringify({ success: true }), { 
                    headers: { ...corsHeaders, "Content-Type": "application/json", "Set-Cookie": cookie } 
                });

            } catch(e) {
                console.error("Delete Error:", e);
                // エラー時も必ず JSON ヘッダーを返す
                return new Response(JSON.stringify({ error: e.message }), { 
                    status: 500, 
                    headers: { ...corsHeaders, "Content-Type": "application/json" } 
                });
            }
        }

        // ==========================================================
        // Google OAuth
        // ==========================================================

        // Googleアカウント連携開始。
        // 認証情報はAuthorizationヘッダーまたはHttpOnlyセッションCookieで受け取り、URLには載せない。
        // URLへ渡すstateは一回限りの乱数であり、連携対象のメールアドレスはTursoにのみ短時間保存する。
        if (url.pathname === "/api/auth/google/connect/start" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), {
                        status: 401,
                        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
                    });
                }

                const state = createGoogleConnectState();
                const stateHash = await sha256Hex(state);
                const expiresAt = Math.floor(Date.now() / 1000) + OAUTH_CONNECT_STATE_TTL_SECONDS;

                await runSQL(
                    "CREATE TABLE IF NOT EXISTS oauth_connect_states (state_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)"
                );
                runSQL("DELETE FROM oauth_connect_states WHERE expires_at < ?", [Math.floor(Date.now() / 1000)]).catch(() => {});
                await runSQL(
                    "INSERT INTO oauth_connect_states (state_hash, email, expires_at) VALUES (?, ?, ?)",
                    [stateHash, session.email, expiresAt]
                );

                const redirectUri = "https://tenmei-mori-backend.nden14800.workers.dev/api/auth/google/callback";
                const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
                googleAuthUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
                googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
                googleAuthUrl.searchParams.set("response_type", "code");
                googleAuthUrl.searchParams.set("scope", "openid email profile");
                googleAuthUrl.searchParams.set("state", state);
                googleAuthUrl.searchParams.set("access_type", "online");
                googleAuthUrl.searchParams.set("prompt", "select_account");

                return new Response(JSON.stringify({ success: true, redirectUrl: googleAuthUrl.toString() }), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store",
                        "Set-Cookie": makeGoogleConnectStateCookie(state, OAUTH_CONNECT_STATE_TTL_SECONDS)
                    }
                });
            } catch (e) {
                console.error("Google connect start error:", e);
                return new Response(JSON.stringify({ error: "connect_start_failed" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
                });
            }
        }

        // Googleログイン開始。ログインフローには署名済みstateを使い、URLにセッショントークンは含めない。
        if (url.pathname === "/api/auth/google/redirect" && method === "GET") {
            const mode = url.searchParams.get("mode") || "login";
            if (mode !== "login") {
                return new Response("Not Found", { status: 404 });
            }

            const statePayloadJson = JSON.stringify({ mode: "login" });
            const stateSig = await signState(statePayloadJson, env.GOOGLE_CLIENT_SECRET);
            const state = btoa(statePayloadJson) + "." + stateSig;

            const redirectUri = "https://tenmei-mori-backend.nden14800.workers.dev/api/auth/google/callback";
            const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            googleAuthUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
            googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
            googleAuthUrl.searchParams.set("response_type", "code");
            googleAuthUrl.searchParams.set("scope", "openid email profile");
            googleAuthUrl.searchParams.set("state", state);
            googleAuthUrl.searchParams.set("access_type", "online");
            googleAuthUrl.searchParams.set("prompt", "select_account");

            return Response.redirect(googleAuthUrl.toString(), 302);
        }

        // Googleからのコールバック処理
        if (url.pathname === "/api/auth/google/callback" && method === "GET") {
            const code = url.searchParams.get("code");
            const stateParam = url.searchParams.get("state");
            const errorParam = url.searchParams.get("error");
            const frontendUrl = ALLOWED_ORIGIN;

            if (errorParam) {
                return Response.redirect(`${frontendUrl}/?google_error=${encodeURIComponent(errorParam)}`, 302);
            }
            if (!code) {
                return Response.redirect(`${frontendUrl}/?google_error=no_code`, 302);
            }

            try {
                // stateはフローごとに厳格に検証する。無効なstateをログインとして継続しない。
                // 連携用stateはTursoのハッシュ済み短命チケットとHttpOnly Cookieの両方で照合し、
                // DELETE ... RETURNINGによって同時リクエストでも一度だけ消費する。
                let stateData = null;
                const nowSeconds = Math.floor(Date.now() / 1000);
                const isConnectState = typeof stateParam === "string" && stateParam.startsWith("connect_");

                if (isConnectState) {
                    const cookieState = getCookie(request, OAUTH_CONNECT_STATE_COOKIE);
                    if (!cookieState || cookieState !== stateParam) {
                        return new Response(null, {
                            status: 302,
                            headers: {
                                "Location": `${frontendUrl}/?google_error=connect_state_invalid`,
                                "Set-Cookie": clearGoogleConnectStateCookie()
                            }
                        });
                    }

                    const stateHash = await sha256Hex(stateParam);
                    const consumedStates = await runSQL(
                        "DELETE FROM oauth_connect_states WHERE state_hash = ? AND expires_at >= ? RETURNING email",
                        [stateHash, nowSeconds]
                    );
                    if (!consumedStates.length || !consumedStates[0].email) {
                        return new Response(null, {
                            status: 302,
                            headers: {
                                "Location": `${frontendUrl}/?google_error=connect_state_invalid`,
                                "Set-Cookie": clearGoogleConnectStateCookie()
                            }
                        });
                    }
                    stateData = { mode: "connect", email: consumedStates[0].email };
                } else {
                    try {
                        const [b64Payload, sig] = (stateParam || "").split(".");
                        const payloadJson = atob(b64Payload || "");
                        const expectedSig = await signState(payloadJson, env.GOOGLE_CLIENT_SECRET);
                        const parsed = JSON.parse(payloadJson);
                        if (sig && sig === expectedSig && parsed.mode === "login") {
                            stateData = { mode: "login" };
                        }
                    } catch {}

                    if (!stateData) {
                        return Response.redirect(`${frontendUrl}/?google_error=state_invalid`, 302);
                    }
                }

                // codeをaccess_tokenに交換
                const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        code,
                        client_id: env.GOOGLE_CLIENT_ID,
                        client_secret: env.GOOGLE_CLIENT_SECRET,
                        redirect_uri: "https://tenmei-mori-backend.nden14800.workers.dev/api/auth/google/callback",
                        grant_type: "authorization_code"
                    })
                });

                const tokenData = await tokenRes.json();
                if (!tokenData.access_token) {
                    console.error("Google token exchange failed:", tokenData);
                    return Response.redirect(`${frontendUrl}/?google_error=token_failed`, 302);
                }

                // Googleユーザー情報を取得
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                });
                const googleUser = await userInfoRes.json();

                const googleId = googleUser.id;
                const googleEmail = googleUser.email.toLowerCase();
                const googleName = googleUser.name || googleEmail.split("@")[0];

                // ==============================
                // コネクトモード（既存アカウントにGoogleを紐付け）
                // ==============================
                if (stateData.mode === "connect" && stateData.email) {
                    const userEmail = stateData.email;

                    // Googleのみのアカウントはコネクト不可
                    const userRows = await runSQL("SELECT auth_method FROM users WHERE email = ?", [userEmail]);
                    if (!userRows.length) {
                        return Response.redirect(`${frontendUrl}/?google_error=user_not_found`, 302);
                    }
                    if (userRows[0].auth_method === "google") {
                        return Response.redirect(`${frontendUrl}/?google_error=google_only_cannot_connect`, 302);
                    }

                    // このgoogle_idが別アカウントで使われていないか確認
                    const existingGoogle = await runSQL("SELECT email FROM users WHERE google_id = ?", [googleId]);
                    if (existingGoogle.length > 0 && existingGoogle[0].email !== userEmail) {
                        return Response.redirect(`${frontendUrl}/?google_error=google_id_already_used`, 302);
                    }

                    // google_idを紐付け、auth_methodを'both'に更新
                    await runSQL("UPDATE users SET google_id = ?, auth_method = 'both' WHERE email = ?", [googleId, userEmail]);
                    return new Response(null, {
                        status: 302,
                        headers: {
                            "Location": `${frontendUrl}/?google_connect=success`,
                            "Set-Cookie": clearGoogleConnectStateCookie()
                        }
                    });
                }

                // ==============================
                // ログインモード
                // ==============================

                // 1. このgoogle_idで登録済みのユーザーがいるか確認
                const existingByGoogleId = await runSQL("SELECT email, username FROM users WHERE google_id = ?", [googleId]);
                if (existingByGoogleId.length > 0) {
                    // 既存Googleユーザーとしてログイン
                    const user = existingByGoogleId[0];
                    const sessionToken = crypto.randomUUID();
                    await runSQL("INSERT INTO sessions (token, email, created_at) VALUES (?, ?, ?)", [sessionToken, user.email, Date.now()]);
                    const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=None`;
                    const exchangeCode = await makeExchangeCode(sessionToken, env.GOOGLE_CLIENT_SECRET);
                    return new Response(null, {
                        status: 302,
                        headers: {
                            ...corsHeaders,
                            "Location": `${frontendUrl}/?google_login=success&code=${encodeURIComponent(exchangeCode)}`,
                            "Set-Cookie": cookie
                        }
                    });
                }

                // 2. 同じメールアドレスがメール認証で登録済みの場合 → エラー（手動コネクトを促す）
                const existingByEmail = await runSQL("SELECT email, auth_method FROM users WHERE email = ?", [googleEmail]);
                if (existingByEmail.length > 0) {
                    return Response.redirect(`${frontendUrl}/?google_error=email_already_registered`, 302);
                }

                // 3. 新規ユーザー作成（Googleのみ）
                // ユーザー名の重複チェック
                let finalUsername = googleName;
                const existingUsername = await runSQL("SELECT username FROM users WHERE username = ?", [googleName]);
                if (existingUsername.length > 0) {
                    finalUsername = googleName + "_" + Math.floor(Math.random() * 9000 + 1000);
                }

                await runSQL(
                    "INSERT INTO users (email, username, password_hash, salt, google_id, auth_method, created_at) VALUES (?, ?, '', '', ?, 'google', ?)",
                    [googleEmail, finalUsername, googleId, Date.now()]
                );
                await runSQL(
                    "INSERT INTO user_profiles (user_email, title, icon_type, icon_color, created_at, total_draws, daikichi_count) VALUES (?, '初詣の旅人', 'bi-person', 'gray', ?, 0, 0)",
                    [googleEmail, Date.now()]
                );
                await runSQL("UPDATE counter SET user_count = user_count + 1 WHERE id = 1");

                const sessionToken = crypto.randomUUID();
                await runSQL("INSERT INTO sessions (token, email, created_at) VALUES (?, ?, ?)", [sessionToken, googleEmail, Date.now()]);
                const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=None`;
                const exchangeCode = await makeExchangeCode(sessionToken, env.GOOGLE_CLIENT_SECRET);
                return new Response(null, {
                    status: 302,
                    headers: {
                        ...corsHeaders,
                        "Location": `${frontendUrl}/?google_login=success&code=${encodeURIComponent(exchangeCode)}`,
                        "Set-Cookie": cookie
                    }
                });

            } catch (e) {
                console.error("Google callback error:", e);
                return Response.redirect(`${frontendUrl}/?google_error=server_error`, 302);
            }
        }

        // ログイン中ユーザーのauth_methodを返す（フロントでUI出し分けに使用）
        if (url.pathname === "/api/auth/method" && method === "GET") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                const rows = await runSQL("SELECT auth_method FROM users WHERE email = ?", [session.email]);
                const authMethod = rows.length ? (rows[0].auth_method || "email") : "email";
                return new Response(JSON.stringify({ auth_method: authMethod }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // Google連携解除
        if (url.pathname === "/api/auth/google/disconnect" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                const rows = await runSQL("SELECT auth_method FROM users WHERE email = ?", [session.email]);
                if (!rows.length) return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                if (rows[0].auth_method !== "both") {
                    return new Response(JSON.stringify({ error: "Googleのみのアカウントは連携解除できません" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                await runSQL("UPDATE users SET google_id = NULL, auth_method = 'email' WHERE email = ?", [session.email]);
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch(e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        // ==========================================================
        // Google OAuth ここまで
        // ==========================================================

        // ==========================================================
        // AI機能（緊急追加!21：悩み相談・夢占い）
        // ==========================================================
        async function callWorkersAI(prompt, systemPrompt, maxCompletionTokens = 192) {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    // GLM-4.7-FlashはWorkers AIのストリーミング経路を使用する。
    // 同期レスポンスでreasoningにトークンを消費して本文contentが空になる
    // ケースを避け、SSE全体を受け取ってから本文だけを抽出する。
    try {
        const stream = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages,
            stream: true,
            max_completion_tokens: Math.max(512, maxCompletionTokens),
            temperature: 0.4,
            chat_template_kwargs: { enable_thinking: false }
        });

        const raw = await new Response(stream).text();
        const chunks = [];
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
                const json = JSON.parse(payload);
                const content =
                    json?.choices?.[0]?.delta?.content ??
                    json?.choices?.[0]?.message?.content ??
                    json?.response ??
                    json?.result?.response ??
                    "";
                if (typeof content === "string" && content.trim()) {
                    chunks.push(content);
                }
            } catch (_) {
                // SSE内の非JSON行は無視する。
            }
        }

        const answer = chunks.join("").trim();
        if (answer) return answer;

        // ストリーム形式が変更された場合の同期フォールバック。
        const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages,
            max_completion_tokens: Math.max(512, maxCompletionTokens),
            temperature: 0.4,
            chat_template_kwargs: { enable_thinking: false }
        });

        const candidates = [
            result?.choices?.[0]?.message?.content,
            result?.choices?.[0]?.text,
            result?.response,
            result?.result?.response,
            result?.result?.choices?.[0]?.message?.content,
            result?.choices?.[0]?.delta?.content
        ];
        const fallback = candidates.find(value =>
            typeof value === "string" && value.trim()
        ) || "";

        if (fallback.trim()) return fallback.trim();
        throw new Error("AI応答が空でした");
    } catch (error) {
        console.error("Workers AI consultation failed:", error);
        throw error;
    }
}

        // ① AI悩み相談（ログイン不要・レート制限あり・その場限りの表示、DB保存なし）
        if (url.pathname === "/api/worry-consult" && method === "POST") {
            try {
                const ip = request.headers.get("CF-Connecting-IP") || "unknown";
                const rate = await checkRateLimit(ip, "worry_consult", 10, 3600); // 1時間10回まで
                if (!rate.allowed) {
                    const waitSec = rate.resetTime - Math.floor(Date.now() / 1000);
                    const msg = `しばらく経ってからもう一度お試しください（あと約${Math.max(1, waitSec)}秒）`;
                    return new Response(JSON.stringify({ error: msg, message: msg }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                const { worry, omikujiType } = await request.json();
                if (!worry || typeof worry !== "string" || worry.length > 300) {
                    return new Response(JSON.stringify({ error: "入力内容をご確認ください（300文字以内）" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                const systemPrompt = "あなたは日本の神社のおみくじに添える、やさしく穏やかな助言者です。断定的な予言や医療・法律・金融の専門的助言は行わず、120文字以内の短い日本語で、前向きで具体的な一言アドバイスのみを返してください。";
                const prompt = `今日引いたおみくじの結果は「${omikujiType || "不明"}」でした。参拝者の悩み・気になっていることは次の通りです：「${worry}」\n\nこの内容を踏まえた、短い一言アドバイスをください。`;

                const advice = await callWorkersAI(
    prompt,
    systemPrompt,
    192
);
                return new Response(JSON.stringify({ advice }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ② AI夢占い（ログイン必須・履歴をTursoに保存）
        if (url.pathname === "/api/dream-fortune" && method === "POST") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                const ip = request.headers.get("CF-Connecting-IP") || "unknown";
                const rate = await checkRateLimit(ip, "dream_fortune", 10, 3600);
                if (!rate.allowed) {
                    const waitSec = rate.resetTime - Math.floor(Date.now() / 1000);
                    const msg = `しばらく経ってからもう一度お試しください（あと約${Math.max(1, waitSec)}秒）`;
                    return new Response(JSON.stringify({ error: msg, message: msg }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                const { dream } = await request.json();
                if (!dream || typeof dream !== "string" || dream.length > 400) {
                    return new Response(JSON.stringify({ error: "入力内容をご確認ください（400文字以内）" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                const systemPrompt = "あなたは日本の夢占いに詳しい、やさしい語り口の鑑定人です。断定的な予言は避け、150文字以内の日本語で、夢に込められた意味を前向きに解釈してください。";
                const prompt = `次のような夢を見ました：「${dream}」\n\nこの夢の夢占い的な意味を教えてください。`;
                const interpretation = await callWorkersAI(
    prompt,
    systemPrompt,
    256
);

                const jstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
                const createdAt = jstNow.toISOString();

                await runSQL(
                    "INSERT INTO dream_history (user_email, dream_text, interpretation, created_at) VALUES (?, ?, ?, ?)",
                    [session.email, dream, interpretation, createdAt]
                );

                return new Response(JSON.stringify({ interpretation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ② 過去の夢の履歴取得
        if (url.pathname === "/api/dream-history" && method === "GET") {
            try {
                const session = await verifySession(request);
                if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

                const params = new URL(request.url).searchParams;
                const page = parseInt(params.get("page") || "1");
                const limit = 30;
                const offset = (page - 1) * limit;

                const rows = await runSQL(
                    "SELECT dream_text, interpretation, created_at FROM dream_history WHERE user_email = ? ORDER BY id DESC LIMIT ? OFFSET ?",
                    [session.email, limit, offset]
                );
                const countRows = await runSQL(
                    "SELECT COUNT(*) as cnt FROM dream_history WHERE user_email = ?",
                    [session.email]
                );
                const totalItems = Number(countRows[0].cnt);

                return new Response(JSON.stringify({
                    history: rows,
                    totalItems,
                    page,
                    perPage: limit
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // 記事要約（キャッシュ済みは即JSON、未キャッシュはストリーミング配信）
        if (url.pathname === "/api/summarize" && method === "POST") {
            try {
                const { articleType, articleId, articleText, articleTitle, originalCharCount: clientOriginalCharCount } = await request.json();
                if (!articleType || !articleId) {
                    return new Response(JSON.stringify({ error: "invalid params" }), { status: 400, headers: corsHeaders });
                }
                const cached = await runSQL(
                    "SELECT summary_text, model_used, original_char_count, summary_char_count, response_time_ms FROM article_summaries WHERE article_type = ? AND article_id = ? LIMIT 1",
                    [articleType, articleId]
                );
                if (cached.length > 0) {
                    return new Response(JSON.stringify({ cached: true, ...cached[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                if (!articleText || typeof articleText !== "string") {
                    return new Response(JSON.stringify({ error: "articleText is required" }), { status: 400, headers: corsHeaders });
                }

                // 【Fix②】ここから先は実際にAI推論を新規に走らせる場合のみ通る経路。
                // キャッシュ済みの記事を要約する分にはレート制限を消費しない一方、
                // 存在しないarticleIdを送りつけて無制限にAIを呼び出すような直叩きを防ぐ。
                const summarizeRate = await checkRateLimit(clientIP, "summarize", 20, 3600); // 1時間20回まで
                if (!summarizeRate.allowed) {
                    const waitSec = summarizeRate.resetTime - Math.floor(Date.now() / 1000);
                    const msg = `しばらく経ってからもう一度お試しください（あと約${Math.max(1, waitSec)}秒）`;
                    return new Response(JSON.stringify({ error: msg, message: msg }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                // 「元の文字数」は記事冒頭に表示される文字数（記事全文・空白除去済み）と一致させる。
                // articleText はAIに渡すために6000文字で切り詰められているため、
                // その長さ(articleText.length)をそのまま使うと長い記事で表示とズレてしまう。
                // クライアントから送られてくる切り詰め前ベースの文字数を優先し、
                // 万一未指定の場合のみ articleText.length にフォールバックする。
                const originalCharCount = (typeof clientOriginalCharCount === "number" && clientOriginalCharCount > 0)
                    ? clientOriginalCharCount
                    : articleText.length;
                const startTime = Date.now();
                const systemPrompt = "あなたは日本語のニュース記事を簡潔に要約するアシスタントです。150文字以内で、要点のみを日本語で分かりやすくまとめてください。";
                const prompt = `以下は「${articleTitle || "記事"}」という記事の本文です。\n\n${articleText}\n\nこの記事を150文字以内で要約してください。`;
                const modelUsed = "@cf/zai-org/glm-4.7-flash";
const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }];

// Workers AIにstream:trueで問い合わせ（SSE形式のReadableStreamが返る）
const aiStream = await env.AI.run(modelUsed, {
    messages,
    stream: true,
    max_completion_tokens: 192,
    temperature: 0.4,
    chat_template_kwargs: {
        enable_thinking: false
    }
});

                // クライアントへはそのまま中継しつつ、裏側では全文を蓄積してDB保存も行う
                const { readable, writable } = new TransformStream();
                const writer = writable.getWriter();
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();

                ctx.waitUntil((async () => {
                    let fullText = "";
                    let buffer = "";
                    try {
                        const reader = aiStream.getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split("\n");
                            buffer = lines.pop(); // 未完成の行は次回に持ち越す

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed.startsWith("data:")) continue;
                                const payload = trimmed.slice(5).trim();
                                if (!payload || payload === "[DONE]") continue;
                                try {
                                    const json = JSON.parse(payload);
                                    const delta =
    json?.choices?.[0]?.delta?.content
        ? String(json.choices[0].delta.content)
        : json?.response
            ? String(json.response)
            : "";

if (delta) {
    fullText += delta;
    await writer.write(
        encoder.encode(
            `data: ${JSON.stringify({ delta })}\n\n`
        )
    );
}
                                } catch (_) { /* パース失敗した行は無視 */ }
                            }
                        }

                        const responseTimeMs = Date.now() - startTime;
                        const summaryText = fullText.trim();
                        const summaryCharCount = summaryText.length;
                        const jstNow2 = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

                        await runSQL(
                            "INSERT INTO article_summaries (article_type, article_id, summary_text, model_used, original_char_count, summary_char_count, response_time_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            [articleType, articleId, summaryText, modelUsed, originalCharCount, summaryCharCount, responseTimeMs, jstNow2.toISOString()]
                        );

                        await writer.write(encoder.encode(`data: ${JSON.stringify({
                            done: true,
                            summary_text: summaryText,
                            model_used: modelUsed,
                            original_char_count: originalCharCount,
                            summary_char_count: summaryCharCount,
                            response_time_ms: responseTimeMs
                        })}\n\n`));
                    } catch (e) {
                        try {
                            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: e.message || "要約中にエラーが発生しました" })}\n\n`));
                        } catch (_) { /* 書き込み失敗時は何もしない */ }
                    } finally {
                        try { await writer.close(); } catch (_) { /* 既に閉じている場合は無視 */ }
                    }
                })());

                return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/api/summary-feedback" && method === "POST") {
            try {
                const { articleType, articleId, vote, detailText } = await request.json();
                if (!articleType || !articleId || (vote !== "like" && vote !== "dislike")) {
                    return new Response(JSON.stringify({ error: "invalid params" }), { status: 400, headers: corsHeaders });
                }
                const session = await verifySession(request);
                let userEmail = null, username = null;
                if (session) {
                    userEmail = session.email;
                    const userRows = await runSQL("SELECT username FROM users WHERE email = ? LIMIT 1", [userEmail]);
                    username = userRows.length > 0 ? userRows[0].username : null;
                }
                const jstNow3 = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
                await runSQL(
                    `INSERT INTO summary_feedback (article_type, article_id, user_email, username, vote, detail_text, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(article_type, article_id, user_email) DO UPDATE SET
                        vote = excluded.vote,
                        username = excluded.username,
                        detail_text = excluded.detail_text,
                        created_at = excluded.created_at`,
                    [articleType, articleId, userEmail, username, vote, detailText || null, jstNow3.toISOString()]
                );
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
}