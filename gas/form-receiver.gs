/**
 * 株式会社大浩 採用LP フォーム受信用 Google Apps Script
 * -------------------------------------------
 * ■ 書き込みに Google Sheets API v4（Advanced Service）を使用
 *   SpreadsheetApp ではなく Sheets API を使うことで、書き込みが
 *   「外部からの変更」として扱われ、別プロジェクトの onChange
 *   トリガーが正常に発火します（auto-mailer.gs は時間トリガー方式のため必須ではないが、
 *   バースナビ運用ノウハウに揃えて Sheets API を採用）。
 *
 * ■ 有効化が必要なサービス:
 *   Apps Script エディタ左メニューの「サービス」横の「＋」をクリック
 *   → 「Google Sheets API」(v4) を選択して「追加」
 *
 * ■ デプロイ手順:
 *   1) スプレッドシート（SPREADSHEET_ID）を開き、拡張機能 → Apps Script
 *   2) このファイルの内容を貼り付け
 *   3) 左メニュー「サービス」→「＋」→ Google Sheets API を追加
 *   4) デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *        - 次のユーザーとして実行: 自分
 *        - アクセスできるユーザー: 全員
 *   5) 発行された URL を js/main.js の GAS_ENDPOINT に設定
 *
 * ■ シート1 の列構成（A〜P）:
 *   A: date           B: time           C: utm_source     D: utm_medium
 *   E: utm_campaign   F: utm_content    G: utm_term       H: お名前
 *   I: 年齢           J: 電話番号        K: メールアドレス  L: 現在のお仕事
 *   M: 気になること   N: SENTフラグ      O: 送付日時        P: Gmail messageId
 */

// ==========================================
// 基本設定
// ==========================================
var SPREADSHEET_ID    = '1ZnJ75_pGmWkSCppBAgCVzu5kgLJor3XhbdLxYkb45bQ';
var TARGET_SHEET_NAME = 'シート1';


// ==========================================
// Webアプリ: POST 受信
// ==========================================
function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // text/plain で JSON が来た場合にも対応
    if ((!params || Object.keys(params).length === 0) && e && e.postData && e.postData.contents) {
      try { params = JSON.parse(e.postData.contents); } catch (err) { params = {}; }
    }

    var name         = String(params.name         || '').trim();
    var age          = String(params.age          || '').trim();
    var tel          = String(params.tel          || '').trim();
    var email        = String(params.email        || '').trim();
    var currentJob   = String(params.currentJob   || '').trim();  // 現在のお仕事
    var message      = String(params.message      || '').trim();  // 気になること・質問など
    var utm_source   = String(params.utm_source   || '').trim();
    var utm_medium   = String(params.utm_medium   || '').trim();
    var utm_campaign = String(params.utm_campaign || '').trim();
    var utm_content  = String(params.utm_content  || '').trim();
    var utm_term     = String(params.utm_term     || '').trim();

    // 必須チェック
    if (!name || !email || !tel) {
      return jsonResponse_({ ok: false, error: 'required_fields_missing' });
    }

    var now     = new Date();
    var dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    var timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm:ss');

    // 現在の最終行を取得
    var existing = Sheets.Spreadsheets.Values.get(SPREADSHEET_ID, TARGET_SHEET_NAME + '!A:P');
    var lastRow = (existing.values && existing.values.length) ? existing.values.length : 1;
    var nextRow = lastRow + 1;
    if (nextRow < 2) nextRow = 2;

    // A〜P (16列) の配列を作成
    var rowData = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    rowData[0]  = dateStr;       // A: date
    rowData[1]  = timeStr;       // B: time
    rowData[2]  = utm_source;    // C
    rowData[3]  = utm_medium;    // D
    rowData[4]  = utm_campaign;  // E
    rowData[5]  = utm_content;   // F
    rowData[6]  = utm_term;      // G
    rowData[7]  = name;          // H: お名前
    rowData[8]  = age;           // I: 年齢
    rowData[9]  = tel;           // J: 電話番号
    rowData[10] = email;         // K: メールアドレス
    rowData[11] = currentJob;    // L: 現在のお仕事
    rowData[12] = message;       // M: 気になること・質問など
    // N〜P (SENT/SENT_AT/MSG_ID) は auto-mailer.gs が書き込む

    var writeRange = TARGET_SHEET_NAME + '!A' + nextRow + ':P' + nextRow;
    Sheets.Spreadsheets.Values.update(
      { values: [rowData] },
      SPREADSHEET_ID,
      writeRange,
      { valueInputOption: 'USER_ENTERED' }
    );

    console.log('Sheets API update 完了: ' + writeRange);

    return jsonResponse_({ ok: true, row: nextRow });

  } catch (err) {
    console.error('doPost error: ' + err);
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

// ==========================================
// Webアプリ: GET（動作確認用）
// ==========================================
function doGet(e) {
  return jsonResponse_({ ok: true, service: 'oohiro-lp-form', sheet: TARGET_SHEET_NAME });
}

// ==========================================
// JSON レスポンス
// ==========================================
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
