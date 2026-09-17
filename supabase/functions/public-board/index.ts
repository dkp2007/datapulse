import { createClient } from "npm:@supabase/supabase-js@2";

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

    const { data: share } = await admin
      .from("board_shares")
      .select("id, board_id, revoked")
      .eq("token", token)
      .eq("revoked", false)
      .single();
    if (!share) return json({ error: "This link is no longer valid" }, 404);

    const { data: dashboard } = await admin
      .from("dashboards")
      .select("id, name, description")
      .eq("id", share.board_id)
      .single();
    if (!dashboard) return json({ error: "Board not found" }, 404);

    const { data: widgets } = await admin
      .from("widgets")
      .select("*")
      .eq("dashboard_id", dashboard.id)
      .order("position");
    if (!widgets?.length) return json({ error: "This board is empty" }, 404);

    const tiles: Record<string, unknown>[] = [];

    for (const w of widgets) {
      const spec = w.spec ?? {};
      const tile: Record<string, unknown> = {
        id: w.id,
        type: w.widget_type,
        title: w.title,
        layout: w.layout,
      };

      if (w.widget_type === "table" || w.widget_type === "pivot") {
        if (!spec.datasetId) continue;
        const cols: string[] = Array.isArray(spec.columns) ? spec.columns : [];
        const { data: raw } = await admin
          .from("dataset_rows")
          .select("data")
          .eq("dataset_id", spec.datasetId)
          .order("row_index")
          .limit(100);
        tile.rows = (raw ?? []).map((r: { data: Record<string, unknown> }) =>
          cols.length ? cols.map((c) => r.data[c] ?? null) : Object.values(r.data),
        );
        tile.columns = cols.length ? cols : [];
        tiles.push(tile);
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
          limit: 100,
        };
      }

      const { data: result } = await admin.rpc("run_widget_query", {
        p_dataset_id: spec.datasetId,
        p_spec: rpcSpec,
      });
      tile.data = result;
      tiles.push(tile);
    }

    return json({
      name: dashboard.name,
      description: dashboard.description,
      tiles,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed to load board" }, 500);
  }
});
