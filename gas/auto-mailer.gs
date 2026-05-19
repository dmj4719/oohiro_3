/**
 * 株式会社大浩 採用LP リード自動メール送信スクリプト
 * -------------------------------------------
 * ■ 配置場所: スプレッドシート 1ZnJ75_pGmWkSCppBAgCVzu5kgLJor3XhbdLxYkb45bQ
 *            にバインドされたコンテナバインドスクリプトとして配置
 *            （SpreadsheetApp.getActiveSpreadsheet() を使うため）
 *
 * ■ トリガー登録（時間主導型・1分毎）:
 *   Apps Script エディタ → トリガー → ＋
 *   - 関数: processLeadsByTimer
 *   - イベントのソース: 時間主導型
 *   - 時間ベースのトリガーのタイプ: 分ベースのタイマー
 *   - 時間の間隔: 1分おき
 *
 *   ※「変更時」トリガーはコンテナバインド要件・権限スコープ・changeType
 *     などの罠が多いため、安定動作する時間トリガー方式を採用。
 *     最大1分の遅延が発生するが、確実に動作する。
 *
 * ■ シート1 の列構成:
 *   H: お名前  I: 年齢  J: 電話番号  K: メール  L: 現在のお仕事  M: 気になること
 *   N: SENTフラグ  O: 送付日時  P: Gmail messageId
 *
 * ■ ⚠️ 差出人情報・本文URL等は要書き換え:
 *   - FROM_NAME / FROM / REPLY_TO / BCC
 *   - 本文中の自社URL・連絡先
 */

const CONFIG = {
  "シート1": {
    COL: {
      LEAD_ID:     null,
      TIMESTAMP:   2,   // B
      NAME:        8,   // H
      AGE:         9,   // I
      PHONE:       10,  // J
      EMAIL:       11,  // K
      CURRENT_JOB: 12,  // L
      MESSAGE:     13,  // M
      SENT_FLAG:   14,  // N
      SENT_AT:     15,  // O
      MSG_ID:      16   // P
    },
    MAIL: {
      // ⚠️ 後で差し替え：実際の差出人情報を設定
      FROM_NAME: "株式会社大浩 採用担当",
      FROM:      "your@example.com",
      REPLY_TO:  "your@example.com",
      SUBJECT:   "【株式会社大浩】エントリーありがとうございます",
      BCC:       "" // 不要なら空文字
    },
    PROP_KEY: "SENT_KEYS_SET_OOHIRO",
    createBody: function(name, meta) {
      const toName = name ? `${name} 様` : "ご応募者 様";
      // ⚠️ 以下、本文ドラフト。実コピーは後ほど差し替え可能。
      return `${toName}

この度は、株式会社大浩へのエントリーをいただき、誠にありがとうございます。
担当者より、ご記入いただいたお電話またはメールアドレスへ、改めてご連絡を差し上げます。

---------

◼️大浩の仕事内容
半導体製造装置や検査装置、精密機器装置の組立・配線を中心とした製造職です。
未経験OK／学歴不問、20-30代を中心に3年で100名以上の積極採用を進めています。

◼️選考フロー
STEP1：フォーム送信（既に完了です）
STEP2：担当よりご連絡（電話 or メール）
STEP3：面談 or 選考（オンライン可・あなたに合った方法で進めます）

応募＝即選考ではありません。
「ちょっと気になる」というお気持ちだけで十分ですので、
面談の場でも、率直なご質問や不安をぜひお聞かせください。

---------

◼️ご記入内容の控え
お名前　　　：${name || "-"}
年齢　　　　：${meta.age || "-"}
電話番号　　：${meta.phone || "-"}
メール　　　：${meta.email || "-"}
現在のお仕事：${meta.currentJob || "-"}
気になること：${meta.message || "-"}

---------

面談前に気になることがございましたら、本メールへのご返信にてお気軽にお問い合わせください。
引き続き、何卒よろしくお願いいたします。

――――――――――――
株式会社大浩 採用担当
URL：https://www.oohiros.co.jp
――――――――――――`;
    }
  }
};

/***** トリガー用エントリーポイント（1分毎の時間主導型） *****/
function processLeadsByTimer() {
  Logger.log("========== processLeadsByTimer START ==========");
  Object.keys(CONFIG).forEach(sheetName => {
    processSheet_(sheetName);
  });
  Logger.log("========== processLeadsByTimer END ==========");
}

/***** 手動実行メニュー *****/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Gmail Auto")
    .addItem("未送付リードを即時処理", "processAllPendingLeads")
    .addToUi();
}

function processAllPendingLeads() {
  Logger.log("========== processAllPendingLeads START (手動実行) ==========");
  Object.keys(CONFIG).forEach(sheetName => {
    processSheet_(sheetName);
  });
  Logger.log("========== processAllPendingLeads END ==========");
}

/***** 内部実装 *****/
function processSheet_(sheetName) {
  Logger.log(`--- processSheet_ START (シート: ${sheetName}) ---`);
  const cfg = CONFIG[sheetName];
  if (!cfg) {
    Logger.log(`[Error] ${sheetName} の設定が見つかりません。`);
    return;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    Logger.log(`[Skip] ${sheetName}: ロック取得失敗。`);
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`[Error] シート「${sheetName}」が存在しません。`);
      return;
    }

    const lastRow = sheet.getLastRow();
    Logger.log(`[Info] 最終行: ${lastRow}`);

    const lastCol = Math.max(cfg.COL.SENT_AT, cfg.COL.MSG_ID, sheet.getLastColumn());

    if (lastRow < 2) {
      Logger.log(`[Skip] データ行なし。`);
      return;
    }

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    Logger.log(`[Info] データ行数: ${values.length}`);

    const props = PropertiesService.getScriptProperties();
    const saved = props.getProperty(cfg.PROP_KEY);
    const sentSet = saved ? new Set(JSON.parse(saved)) : new Set();

    const updates = [];

    values.forEach((row, i) => {
      const rowIndex = i + 2;

      const sentFlag = row[cfg.COL.SENT_FLAG - 1];
      if (String(sentFlag).trim().toUpperCase() === "SENT") return;

      const key = buildUniqueKey_(row, cfg);
      if (!key) return;
      if (sentSet.has(key)) return;

      const name = safeCell_(row, cfg.COL.NAME);
      const email = safeCell_(row, cfg.COL.EMAIL);

      if (!email) return;
      if (!validateEmail_(email)) return;

      const meta = {
        email:       email,
        age:         safeCell_(row, cfg.COL.AGE),
        phone:       safeCell_(row, cfg.COL.PHONE),
        currentJob:  safeCell_(row, cfg.COL.CURRENT_JOB),
        message:     safeCell_(row, cfg.COL.MESSAGE)
      };

      try {
        Logger.log(`[Info] 行 ${rowIndex} (${email}) へ送信試行...`);
        const res = sendMailForLead_(name, email, meta, cfg);
        const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

        updates.push({ rowIndex, sentFlag: "SENT", sentAt: nowStr, msgId: res && res.getId ? res.getId() : "" });
        sentSet.add(key);
        Logger.log(`✅ ${sheetName} 行 ${rowIndex} 送信成功: ${email}`);
      } catch (e) {
        Logger.log(`❌ ${sheetName} 行 ${rowIndex} 送信失敗: ${email} / ${e.message}`);
      }
    });

    if (updates.length > 0) {
      updates.forEach(u => {
        sheet.getRange(u.rowIndex, cfg.COL.SENT_FLAG).setValue(u.sentFlag);
        sheet.getRange(u.rowIndex, cfg.COL.SENT_AT).setValue(u.sentAt);
        if (cfg.COL.MSG_ID) {
          sheet.getRange(u.rowIndex, cfg.COL.MSG_ID).setValue(u.msgId);
        }
      });
      props.setProperty(cfg.PROP_KEY, JSON.stringify(Array.from(sentSet)));
      Logger.log(`[Info] ${updates.length} 件 書き込み完了。`);
    } else {
      Logger.log(`[Info] 新規送信なし。`);
    }
  } catch (e) {
    Logger.log(`[Fatal Error] ${e.message}`);
  } finally {
    lock.releaseLock();
    Logger.log(`--- processSheet_ END (シート: ${sheetName}) ---`);
  }
}

/***** メール送信 *****/
function sendMailForLead_(name, email, meta, cfg) {
  const subject = cfg.MAIL.SUBJECT;
  const plainBody = cfg.createBody(name, meta);
  const htmlBody = plainBody.split("\n").map(sanitizeHtml_).join("<br>");

  const options = {
    name: cfg.MAIL.FROM_NAME,
    htmlBody: htmlBody
  };
  if (cfg.MAIL.REPLY_TO) options.replyTo = cfg.MAIL.REPLY_TO;
  if (cfg.MAIL.BCC)      options.bcc = cfg.MAIL.BCC;
  if (cfg.MAIL.FROM)     options.from = cfg.MAIL.FROM;

  return GmailApp.sendEmail(email, subject, plainBody, options);
}

/***** ユーティリティ *****/
function buildUniqueKey_(row, cfg) {
  const leadId = cfg.COL.LEAD_ID ? safeCell_(row, cfg.COL.LEAD_ID) : "";
  if (leadId) return `ID:${leadId}`;
  const email = safeCell_(row, cfg.COL.EMAIL);
  const ts = cfg.COL.TIMESTAMP ? safeCell_(row, cfg.COL.TIMESTAMP) : "";
  if (email && ts) return `EM:${email}|TS:${ts}`;
  const raw = row.join("||");
  if (!raw || raw.replace(/\|\|/g, "").trim() === "") return "";
  const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)).slice(0, 32);
  return `H:${hash}`;
}

function validateEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

function safeCell_(row, colNum) {
  const v = row[colNum - 1];
  return (v === null || v === undefined) ? "" : String(v).trim();
}

function sanitizeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
