

import { createClient } from "npm:@supabase/supabase-js@2";
import Papa from "npm:papaparse@5.4.1";
import ExcelJS from "npm:exceljs@4.4.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing authorization token" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
  const userId = userData.user.id;

  let body: { dashboardId?: string; widgetIds?: string[]; name?: string; format?: string; kpis?: { title: string; value: unknown; prev?: unknown; deltaPct?: number | null }[]; charts?: { title: string; image: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const format = body.format === "xlsx" ? "xlsx" : "csv";
  const dashboardId = body.dashboardId;
  if (!dashboardId) return json({ error: "dashboardId is required" }, 400);

  const { data: dashboard, error: dashErr } = await userClient
    .from("dashboards")
    .select("id, name")
    .eq("id", dashboardId)
    .single();
  if (dashErr || !dashboard) return json({ error: "Dashboard not found" }, 404);

  const { data: biz } = await userClient
    .from("business_profile")
    .select("business_name, gstin, pan, address_line, city, state, pincode")
    .maybeSingle();

  const bizLines: string[] = [];
  if (biz) {
    if (biz.business_name) bizLines.push(String(biz.business_name));
    const infoBits: string[] = [];
    if (biz.gstin) infoBits.push(`GSTIN: ${biz.gstin}`);
    const addrBits = [biz.address_line, biz.city, biz.state, biz.pincode]
      .filter(Boolean)
      .join(", ");
    if (addrBits) infoBits.push(addrBits);
    if (infoBits.length) bizLines.push(infoBits.join(" · "));
  }
  const generatedLine = `Generated on ${new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  let query = userClient.from("widgets").select("*").eq("dashboard_id", dashboardId);
  if (body.widgetIds?.length) query = query.in("id", body.widgetIds);
  const { data: widgets, error: wErr } = await query.order("position");
  if (wErr) return json({ error: wErr.message }, 500);
  if (!widgets?.length) return json({ error: "No widgets selected" }, 400);

  const sheets: { title: string; rows: Record<string, unknown>[] }[] = [];
  let totalRows = 0;

  for (const w of widgets) {
    const spec = w.spec ?? {};
    const title = (w.title || w.widget_type).replace(/[/\\?*[\]:]/g, "-").slice(0, 31);

    if (w.widget_type === "table") {

      const datasetId = spec.datasetId;
      if (!datasetId) continue;
      const cols: string[] = Array.isArray(spec.columns) && spec.columns.length
        ? spec.columns
        : [];
      let rq = userClient
        .from("dataset_rows")
        .select("row_index, data")
        .eq("dataset_id", datasetId)
        .order("row_index")
        .limit(10_000);
      const { data: raw, error: rErr } = await rq;
      if (rErr) return json({ error: rErr.message }, 500);
      const rows = (raw ?? []).map((r: { data: Record<string, unknown> }) => {
        if (!cols.length) return r.data;
        const filtered: Record<string, unknown> = {};
        for (const c of cols) filtered[c] = r.data[c] ?? null;
        return filtered;
      });
      sheets.push({ title, rows });
      totalRows += rows.length;
      continue;
    }

    let rpcSpec: Record<string, unknown>;
    if (w.widget_type === "kpi") {
      rpcSpec = {
        kind: "scalar",
        measure: { agg: spec.agg ?? "sum", field: spec.field },
        dateField: spec.dateField ?? null,
        dateFrom: spec.dateFrom ?? null,
        dateTo: spec.dateTo ?? null,
        comparePrev: !!spec.comparePrev,
        filters: spec.filters ?? [],
      };
    } else {
      rpcSpec = {
        kind: "series",
        dimension: spec.dimension,
        dimensionType: spec.dimensionType ?? "text",
        dateGrain: spec.dateGrain ?? "month",
        measures: spec.measures ?? [],
        filters: spec.filters ?? [],
        limit: 1000,
      };
    }

    const { data: result, error: rpcErr } = await userClient.rpc("run_widget_query", {
      p_dataset_id: spec.datasetId,
      p_spec: rpcSpec,
    });
    if (rpcErr) return json({ error: `Widget "${title}": ${rpcErr.message}` }, 400);

    const rows: Record<string, unknown>[] = [];
    if (result?.kind === "scalar") {
      const r: Record<string, unknown> = { metric: w.title, value: result.value };
      if (result.prev !== null && result.prev !== undefined) r.previous = result.prev;
      if (result.deltaPct !== null && result.deltaPct !== undefined) r["change_%"] = result.deltaPct;
      rows.push(r);
    } else if (result?.kind === "series") {
      const measureCount = (spec.measures ?? []).length;
      for (const r of result.rows ?? []) {
        const row: Record<string, unknown> = { [result.dimension]: r.dimension };
        for (let i = 0; i < measureCount; i++) {
          const m = spec.measures[i];
          const label = `${m.agg}(${m.field})`;
          row[label] = r.values?.[i] ?? null;
        }
        rows.push(row);
      }
    }
    sheets.push({ title, rows });
    totalRows += rows.length;
  }

  if (!sheets.length) return json({ error: "Nothing to export" }, 400);

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (body.name || dashboard.name).replace(/[^a-z0-9\-_ ]/gi, "").trim() || "report";
  const filename = `${safeName}-${stamp}.${format}`;

  let out: ArrayBuffer;
  let contentType: string;
  let out: ArrayBuffer;
  let contentType: string;
  if (format === "csv") {

    const parts: string[] = [];
    if (bizLines.length) {
      for (const l of bizLines) parts.push(`# ${l}`);
      parts.push(`# ${generatedLine}`);
      parts.push("");
    }
    for (const s of sheets) {
      parts.push(`# ${s.title}`);
      parts.push(Papa.unparse(s.rows));
      parts.push("");
    }
    out = new TextEncoder().encode(parts.join("\n")).buffer as ArrayBuffer;
    contentType = "text/csv; charset=utf-8";
  } else if (format === "pdf") {
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const parts: string[] = [];
    parts.push("BT /F1 16 Tf 50 790 Td (" + esc(dashboard.name) + ") Tj ET");
    let y = 762;
    for (const line of bizLines) {
      parts.push("BT /F1 9 Tf 50 " + y + " Td (" + esc(line) + ") Tj ET");
      y -= 14;
    }
    y -= 6;
    parts.push("BT /F1 8 Tf 50 " + y + " Td (" + esc(generatedLine) + ") Tj ET");
    y -= 24;

    for (const k of body.kpis ?? []) {
      if (y < 60) break;
      const delta = k.deltaPct !== null && k.deltaPct !== undefined ? `  (${k.deltaPct > 0 ? "+" : ""}${k.deltaPct}%)` : "";
      parts.push("BT /F1 11 Tf 50 " + y + " Td (" + esc(`${k.title}: ${k.value}${delta}`) + ") Tj ET");
      y -= 16;
    }
    if (body.kpis?.length) y -= 10;

    for (const s of sheets.slice(0, 4)) {
      if (y < 80) break;
      parts.push("BT /F1 12 Tf 50 " + y + " Td (" + esc(s.title) + ") Tj ET");
      y -= 16;
      if (s.rows.length) {
        const headers = [...new Set(s.rows.flatMap((r) => Object.keys(r)))].slice(0, 6);
        parts.push("BT /F1 8 Tf 50 " + y + " Td (" + esc(headers.join("   |   ")) + ") Tj ET");
        y -= 12;
        for (const r of s.rows.slice(0, 12)) {
          if (y < 50) break;
          const line = headers.map((h) => String(r[h] ?? "")).join("   |   ").slice(0, 110);
          parts.push("BT /F1 8 Tf 50 " + y + " Td (" + esc(line) + ") Tj ET");
          y -= 11;
        }
      }
      y -= 12;
    }

    const stream = parts.join("\n");
    const objects: string[] = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream");

    let pdfOut = "%PDF-1.4\n";
    const offsets: number[] = [0];
    objects.forEach((b, i) => {
      offsets.push(pdfOut.length);
      pdfOut += (i + 1) + " 0 obj\n" + b + "\nendobj\n";
    });
    const xrefPos = pdfOut.length;
    pdfOut += "xref\n0 " + (objects.length + 1) + "\n";
    pdfOut += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdfOut += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    pdfOut += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
    out = new TextEncoder().encode(pdfOut).buffer as ArrayBuffer;
    contentType = "application/pdf";
  } else {
    const wb = new ExcelJS.Workbook();
    wb.creator = "DataPulse";
    let isFirstSheet = true;
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.title || "Sheet");
      if (isFirstSheet && bizLines.length) {
        const lines = [...bizLines, generatedLine];
        lines.forEach((text, i) => {
          const row = ws.addRow([text]);
          const cell = row.getCell(1);
          cell.font = i === 0
            ? { bold: true, size: 14, color: { argb: "FF0F172A" } }
            : { size: 10, color: { argb: "FF64748B" } };
          cell.alignment = { vertical: "middle" };
          ws.mergeCells(row.number, 1, row.number, 8);
        });
        ws.addRow([]);
        isFirstSheet = false;
      }
      if (s.rows.length) {
        const headers = [...new Set(s.rows.flatMap((r) => Object.keys(r)))];
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true };
        for (const r of s.rows) ws.addRow(headers.map((h) => r[h] ?? null));
      }
    }
    const buf = await wb.xlsx.writeBuffer();
    out = buf as ArrayBuffer;
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  await userClient.from("reports").insert({
    owner_id: userId,
    dashboard_id: dashboardId,
    name: body.name || dashboard.name,
    config: {
      widgetIds: body.widgetIds ?? widgets.map((w: { id: string }) => w.id),
      format,
      rowCount: totalRows,
    },
  });

  return new Response(out, {
    headers: {
      ...CORS,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
