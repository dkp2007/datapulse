

import { createClient } from "npm:@supabase/supabase-js@2";
import Papa from "npm:papaparse@5.4.1";
import ExcelJS from "npm:exceljs@4.4.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ROWS = 100_000;
const MAX_BYTES = 25 * 1024 * 1024;
const CHUNK = 1000;
const DATE_RE = /^\d{4}-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2})?)?Z?$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function inferType(values: unknown[]): string {
  let sawNumber = false;
  let sawDate = false;
  let sawBool = false;
  let sawText = false;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "number") sawNumber = true;
    else if (typeof v === "boolean") sawBool = true;
    else if (typeof v === "string") {
      const s = v.trim();
      if (s !== "" && !isNaN(Number(s))) sawNumber = true;
      else if (DATE_RE.test(s)) sawDate = true;
      else if (/^(true|false)$/i.test(s)) sawBool = true;
      else sawText = true;
    }
  }
  if (sawText) return "text";
  if (sawDate) return "date";
  if (sawBool && !sawNumber) return "boolean";
  if (sawNumber) return "number";
  return "text";
}

function coerce(value: unknown, type: string): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number") {
    const n = Number(value);
    return isNaN(n) ? String(value) : n;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    return /^true$/i.test(String(value));
  }
  return String(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing authorization token" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
  const userId = userData.user.id;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let records: Record<string, unknown>[] = [];
    let datasetName = "";
    let sourceType = "csv";
    let filename = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const sheetsUrl: string = (body.sheetsUrl ?? "").trim();
      if (!sheetsUrl) return json({ error: "Missing sheetsUrl" }, 400);
      const m = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!m) return json({ error: "That does not look like a Google Sheets link" }, 400);

      const gidMatch = sheetsUrl.match(/[#&?]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;

      const res = await fetch(csvUrl);
      if (!res.ok) {
        return json(
          {
            error:
              res.status === 403 || res.status === 401 || res.status === 302
                ? "Could not open the sheet — make sure sharing is set to 'Anyone with the link can view'."
                : `Could not fetch the sheet (${res.status})`,
          },
          400,
        );
      }
      const csvText = await res.text();
      if (csvText.trim().startsWith("<")) {
        return json({ error: "Could not read the sheet — make sure sharing is set to 'Anyone with the link can view'." }, 400);
      }
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim(),
      });
      if (parsed.errors.length && !parsed.data.length) {
        return json({ error: `Sheet parse error: ${parsed.errors[0].message}` }, 400);
      }
      records = parsed.data;
      datasetName = (body.name as string | null)?.trim() || "Google Sheet";
      sourceType = "sheets";
      filename = sheetsUrl.slice(0, 200);
    } else {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Missing file" }, 400);
      if (file.size > MAX_BYTES) return json({ error: "File exceeds 25MB limit" }, 413);

      datasetName = (form.get("name") as string | null)?.trim() ||
        file.name.replace(/\.(csv|xlsx)$/i, "");
      filename = file.name;
      const lower = filename.toLowerCase();
      sourceType = lower.endsWith(".xlsx") ? "xlsx" : "csv";

      if (lower.endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (h) => h.trim(),
        });
        if (parsed.errors.length && !parsed.data.length) {
          return json({ error: `CSV parse error: ${parsed.errors[0].message}` }, 400);
        }
        records = parsed.data;
      } else if (lower.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) return json({ error: "Workbook has no sheets" }, 400);
      const headers: string[] = [];
      ws.getRow(1).eachCell((cell, col) => {
        headers[col] = String(cell.value ?? "").trim();
      });
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: Record<string, unknown> = {};
        let hasValue = false;
        row.eachCell({ includeEmpty: false }, (cell, col) => {
          const key = headers[col];
          if (!key) return;
          let v: unknown = cell.value;

          if (v && typeof v === "object" && "result" in (v as object)) {
            v = (v as { result: unknown }).result;
          }
          if (v instanceof Date) v = v.toISOString().slice(0, 10);
          if (v !== null && v !== undefined && v !== "") hasValue = true;
          obj[key] = v as unknown;
        });
        if (hasValue) records.push(obj);
      });
      } else {
        return json({ error: "Unsupported file type — use .csv or .xlsx" }, 400);
      }
    }

    if (!records.length) return json({ error: "File contains no data rows" }, 400);
    if (records.length > MAX_ROWS) return json({ error: `Max ${MAX_ROWS} rows per dataset` }, 413);

    const colNames: string[] = [];
    const seen = new Set<string>();
    for (const r of records) {
      for (const k of Object.keys(r)) {
        if (k && !seen.has(k)) {
          seen.add(k);
          colNames.push(k);
        }
      }
    }
    if (!colNames.length) return json({ error: "No columns detected in file" }, 400);

    const lowerNames = colNames.map((n) => n.toLowerCase());
    const hasDepositWithdraw =
      lowerNames.includes("deposit") && lowerNames.includes("withdrawal") &&
      !lowerNames.includes("amount");
    const hasCreditDebit =
      lowerNames.includes("credit") && lowerNames.includes("debit") &&
      !lowerNames.includes("amount");
    if (hasDepositWithdraw || hasCreditDebit) {
      const inNames = hasDepositWithdraw ? ["deposit", "credit amount"] : ["credit"];
      const outNames = hasDepositWithdraw ? ["withdrawal", "debit amount"] : ["debit"];
      const inCol = colNames[lowerNames.findIndex((n) => inNames.includes(n))];
      const outCol = colNames[lowerNames.findIndex((n) => outNames.includes(n))];
      const dateCol = colNames[lowerNames.findIndex((n) => n.includes("date"))] ?? "";
      const descCol =
        colNames[lowerNames.findIndex((n) => /particular|description|narration|remark|details/.test(n))] ?? "";
      const balCol = colNames[lowerNames.findIndex((n) => n.includes("balance"))] ?? "";

      for (const r of records) {
        const inV = Number(r[inCol]) || 0;
        const outV = Number(r[outCol]) || 0;
        r.amount = inV > 0 ? inV : outV > 0 ? outV : null;
        r.direction = inV > 0 ? "money in" : outV > 0 ? "money out" : null;
        if (dateCol && r[dateCol]) r.date = r[dateCol];
        if (descCol && r[descCol]) r.particulars = r[descCol];
        if (balCol) r.balance = r[balCol];
      }
      const drop = new Set([inCol, outCol]);
      if (dateCol) drop.add(dateCol);
      if (descCol) drop.add(descCol);
      if (balCol) drop.add(balCol);
      for (const r of records) {
        for (const k of drop) if (k && k in r) delete r[k];
        r["source file"] = filename.slice(0, 60);
      }
      const extra = ["date", "particulars", "amount", "direction"];
      const rest = colNames.filter((n) => !drop.has(n));
      colNames.length = 0;
      colNames.push(...extra.filter((n) => !colNames.includes(n)), ...rest, "source file");
    }

    const columns = colNames.map((name, i) => ({
      name,
      position: i,
      data_type: inferType(records.slice(0, 200).map((r) => r[name])),
    }));

    const { data: ds, error: dsErr } = await admin
      .from("datasets")
      .insert({
        owner_id: userId,
        name: datasetName,
        source_type: sourceType === "sheets" ? "csv" : sourceType,
        source_filename: filename,
        row_count: records.length,
      })
      .select("id")
      .single();
    if (dsErr) return json({ error: dsErr.message }, 500);

    const { error: colErr } = await admin
      .from("dataset_columns")
      .insert(columns.map((c) => ({ ...c, dataset_id: ds.id })));
    if (colErr) return json({ error: colErr.message }, 500);

    const rowsPayload = records.map((r, i) => {
      const data: Record<string, unknown> = {};
      for (const c of columns) data[c.name] = coerce(r[c.name], c.data_type);
      return { dataset_id: ds.id, row_index: i, data };
    });
    for (let i = 0; i < rowsPayload.length; i += CHUNK) {
      const { error: rowErr } = await admin
        .from("dataset_rows")
        .insert(rowsPayload.slice(i, i + CHUNK));
      if (rowErr) return json({ error: rowErr.message, datasetId: ds.id }, 500);
    }

    return json({
      datasetId: ds.id,
      name: datasetName,
      rowCount: records.length,
      columns: columns.map(({ name, data_type }) => ({ name, type: data_type })),
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Import failed" }, 500);
  }
});
