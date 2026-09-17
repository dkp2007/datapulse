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

type Sheet = { title: string; rows: Record<string, unknown>[] };

function buildCsv(sheets: Sheet[], bizLines: string[], generatedLine: string): Uint8Array {
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
  return new TextEncoder().encode(parts.join("\n"));
}

async function buildXlsx(sheets: Sheet[], bizLines: string[], generatedLine: string): Promise<Uint8Array> {
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
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

function buildPdf(title: string, sheets: Sheet[], bizLines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const parts: string[] = [];
  parts.push("BT /F1 16 Tf 50 790 Td (" + esc(title) + ") Tj ET");
  let y = 762;
  for (const line of bizLines) {
    parts.push("BT /F1 9 Tf 50 " + y + " Td (" + esc(line) + ") Tj ET");
    y -= 14;
  }
  y -= 10;
  for (const s of sheets) {
    if (y < 60) break;
    parts.push("BT /F1 12 Tf 50 " + y + " Td (" + esc(s.title) + ") Tj ET");
    y -= 16;
    if (s.rows.length) {
      const headers = [...new Set(s.rows.flatMap((r) => Object.keys(r)))].slice(0, 6);
      parts.push("BT /F1 8 Tf 50 " + y + " Td (" + esc(headers.join("   |   ")) + ") Tj ET");
      y -= 12;
      for (const r of s.rows.slice(0, 18)) {
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

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += (i + 1) + " 0 obj\n" + body + "\nendobj\n";
  });
  const xrefPos = out.length;
  out += "xref\n0 " + (objects.length + 1) + "\n";
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  out += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
  return new TextEncoder().encode(out);
}

const pdfTitleLine = (t: string) => t.replace(/[/\\?*[\]:]/g, "-").slice(0, 60);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const isCron =
    (Deno.env.get("CRON_SECRET") && token === Deno.env.get("CRON_SECRET")) ||
    token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  if (!isCron) {
    if (!token) return json({ error: "Missing authorization token" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
    return json({ ok: true, message: "Use the automatic schedule; manual runs are not needed." });
  }

  try {
    const now = new Date();
    const currentHourUtc = now.getUTCHours();

    const { data: schedules, error: sErr } = await admin
      .from("report_schedules")
      .select("*")
      .eq("active", true)
      .eq("hour_utc", currentHourUtc);
    if (sErr) return json({ error: sErr.message }, 500);

    const due = (schedules ?? []).filter((s: Record<string, unknown>) => {
      if (s.frequency === "daily") return true;
      if (s.frequency === "weekly") return s.day_of_week === now.getUTCDay();
      const dom = now.getUTCDate();
      return Math.min(Number(s.day_of_month), 28) === Math.min(dom, 28);
    });
    if (!due.length) return json({ ok: true, sent: 0 });

    let sent = 0;
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const errors: string[] = [];

    for (const sched of due) {
      try {
        const { data: dashboard } = await admin
          .from("dashboards")
          .select("id, name")
          .eq("id", sched.dashboard_id)
          .single();
        if (!dashboard) continue;

        const { data: widgets } = await admin
          .from("widgets")
          .select("*")
          .eq("dashboard_id", dashboard.id)
          .order("position");
        if (!widgets?.length) continue;

        const sheets: Sheet[] = [];
        for (const w of widgets) {
          const spec = w.spec ?? {};
          const title = (w.title || w.widget_type).replace(/[/\\?*[\]:]/g, "-").slice(0, 31);

          if (w.widget_type === "table") {
            if (!spec.datasetId) continue;
            const cols: string[] = Array.isArray(spec.columns) ? spec.columns : [];
            const { data: raw } = await admin
              .from("dataset_rows")
              .select("row_index, data")
              .eq("dataset_id", spec.datasetId)
              .order("row_index")
              .limit(2000);
            const rows = (raw ?? []).map((r: { data: Record<string, unknown> }) => {
              if (!cols.length) return r.data;
              const filtered: Record<string, unknown> = {};
              for (const c of cols) filtered[c] = r.data[c] ?? null;
              return filtered;
            });
            sheets.push({ title, rows });
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

          const { data: result } = await admin.rpc("run_widget_query", {
            p_dataset_id: spec.datasetId,
            p_spec: rpcSpec,
          });

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
                row[`${m.agg}(${m.field})`] = r.values?.[i] ?? null;
              }
              rows.push(row);
            }
          }
          sheets.push({ title, rows });
        }
        if (!sheets.length) continue;

        const { data: biz } = await admin
          .from("business_profile")
          .select("business_name, gstin, pan, address_line, city, state, pincode")
          .eq("owner_id", sched.owner_id)
          .maybeSingle();
        const bizLines: string[] = [];
        if (biz) {
          if (biz.business_name) bizLines.push(String(biz.business_name));
          const bits: string[] = [];
          if (biz.gstin) bits.push(`GSTIN: ${biz.gstin}`);
          const addr = [biz.address_line, biz.city, biz.state, biz.pincode].filter(Boolean).join(", ");
          if (addr) bits.push(addr);
          if (bits.length) bizLines.push(bits.join(" · "));
        }
        const generatedLine = `Generated on ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

        const format = sched.format ?? "pdf";
        const stamp = now.toISOString().slice(0, 10);
        const safeName = (dashboard.name || "report").replace(/[^a-z0-9\-_ ]/gi, "").trim() || "report";
        const filename = `${safeName}-${stamp}.${format}`;

        let bytes: Uint8Array;
        let contentType: string;
        if (format === "csv") {
          bytes = buildCsv(sheets, bizLines, generatedLine);
          contentType = "text/csv; charset=utf-8";
        } else if (format === "xlsx") {
          bytes = await buildXlsx(sheets, bizLines, generatedLine);
          contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else {
          bytes = buildPdf(pdfTitleLine(dashboard.name), sheets, bizLines);
          contentType = "application/pdf";
        }

        const objectPath = `${sched.owner_id}/${sched.id}-${filename}`;
        const { error: upErr } = await admin.storage
          .from("scheduled-reports")
          .upload(objectPath, bytes, { contentType, upsert: true });
        if (upErr) {
          errors.push(`upload: ${upErr.message}`);
          continue;
        }

        const { data: urlData } = await admin.storage
          .from("scheduled-reports")
          .createSignedUrl(objectPath, 60 * 60 * 24 * 7);
        const downloadUrl = urlData?.signedUrl;

        await admin.from("reports").insert({
          owner_id: sched.owner_id,
          dashboard_id: dashboard.id,
          name: `${dashboard.name} (auto, ${stamp})`,
          config: { format, rowCount: sheets.reduce((n, s) => n + s.rows.length, 0), scheduled: true },
        });

        await admin
          .from("report_schedules")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", sched.id);

        if (resendKey && downloadUrl) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "DataPulse Reports <reports@resend.dev>",
              to: [sched.email],
              subject: `Your DataPulse report: ${dashboard.name}`,
              html: `<p>Hello,</p><p>Your scheduled report <b>${dashboard.name}</b> is ready.</p>
                     <p><a href="${downloadUrl}">Download the ${format.toUpperCase()}</a> (link valid for 7 days)</p>
                     <p style="color:#888;font-size:12px">Sent automatically by DataPulse.</p>`,
            }),
          });
        }

        sent++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    return json({ ok: true, sent, errors: errors.length ? errors : undefined });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Scheduling failed" }, 500);
  }
});
