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
                

--- TRUNCATED ---
Response was ~26,804 tokens (limit: 6,000). Use more specific queries to reduce response size.