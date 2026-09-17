import { supabase } from './supabase.js';

export const auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
};

export const datasets = {
  list() {
    return supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });
  },
  get(id) {
    return supabase
      .from('datasets')
      .select('*, dataset_columns(*)')
      .eq('id', id)
      .single();
  },
  async remove(id) {
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) throw error;
  },
  async rename(id, name) {
    const { error } = await supabase.from('datasets').update({ name }).eq('id', id);
    if (error) throw error;
  },
  async createManual(name, description) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('datasets')
      .insert({
        owner_id: uid,
        name,
        description: description || null,
        source_type: 'csv',
        source_filename: null,
        row_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async setColumns(datasetId, columns) {
    const { error } = await supabase.from('dataset_columns').delete().eq('dataset_id', datasetId);
    if (error) throw error;
    if (!columns.length) return;
    const { error: insErr } = await supabase
      .from('dataset_columns')
      .insert(columns.map((c, i) => ({ dataset_id: datasetId, name: c.name, data_type: c.data_type, position: i })));
    if (insErr) throw insErr;
  },
  async setRows(datasetId, rows) {
    const chunkOf = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    const { error: delErr } = await supabase.from('dataset_rows').delete().eq('dataset_id', datasetId);
    if (delErr) throw delErr;
    for (const chunk of chunkOf(rows, 500)) {
      const { error } = await supabase
        .from('dataset_rows')
        .insert(chunk.map((data, i) => ({ dataset_id: datasetId, row_index: i, data })));
      if (error) throw error;
    }
    const { error: updErr } = await supabase
      .from('datasets')
      .update({ row_count: rows.length, source_type: 'manual' })
      .eq('id', datasetId);
    if (updErr) throw updErr;
  },
  rows(id, { limit = 50 } = {}) {
    return supabase
      .from('dataset_rows')
      .select('row_index, data')
      .eq('dataset_id', id)
      .order('row_index')
      .limit(limit);
  },
};

export const dashboards = {
  list() {
    return supabase
      .from('dashboards')
      .select('*, widgets(id, widget_type)')
      .order('created_at', { ascending: false });
  },
  get(id) {
    return supabase
      .from('dashboards')
      .select('*, widgets(*)')
      .eq('id', id)
      .single();
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('dashboards')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const { error } = await supabase.from('dashboards').update(patch).eq('id', id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from('dashboards').delete().eq('id', id);
    if (error) throw error;
  },
  async createWidget(widget) {
    const { data, error } = await supabase.from('widgets').insert(widget).select().single();
    if (error) throw error;
    return data;
  },
  async updateWidget(id, patch) {
    const { error } = await supabase.from('widgets').update(patch).eq('id', id);
    if (error) throw error;
  },
  async removeWidget(id) {
    const { error } = await supabase.from('widgets').delete().eq('id', id);
    if (error) throw error;
  },
};

export const profile = {
  async get() {
    const { data, error } = await supabase
      .from('business_profile')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async save(patch) {
    const { data, error } = await supabase.rpc('upsert_business_profile', { p_patch: patch });
    if (error) throw error;
    return data;
  },
};

export const DOC_TYPES = [
  { value: 'gst', label: 'GST certificate' },
  { value: 'pan', label: 'PAN card' },
  { value: 'udyam', label: 'Udyam / MSME' },
  { value: 'incorporation', label: 'Incorporation / partnership' },
  { value: 'license', label: 'Licenses / trade license' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'statement', label: 'Bank statements' },
  { value: 'contract', label: 'Contracts / agreements' },
  { value: 'other', label: 'Other papers' },
];

export const documents = {
  list() {
    return supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
  },
  async upload(file, name, docType) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');

    const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('documents')
      .insert({
        name: name || file.name,
        doc_type: docType || 'other',
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();
    if (error) {
      await supabase.storage.from('documents').remove([path]);
      throw error;
    }
    return data;
  },
  async rename(id, name) {
    const { error } = await supabase.from('documents').update({ name }).eq('id', id);
    if (error) throw error;
  },
  async setType(id, docType) {
    const { error } = await supabase.from('documents').update({ doc_type: docType }).eq('id', id);
    if (error) throw error;
  },
  async remove(doc) {
    await supabase.storage.from('documents').remove([doc.file_path]);
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) throw error;
  },
  async signedUrl(filePath, { download } = {}) {
    const opts = download ? { download } : {};
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60, opts);
    if (error) throw error;
    return data.signedUrl;
  },
};

export const goals = {
  list() {
    return supabase
      .from('goals')
      .select('*, datasets(name)')
      .order('created_at', { ascending: false });
  },
  async create(payload) {
    const { data, error } = await supabase.from('goals').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const { error } = await supabase.from('goals').update(patch).eq('id', id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },
  async progress(id) {
    const { data, error } = await supabase.rpc('current_period_value', { p_goal_id: id });
    if (error) throw error;
    return data;
  },
};

export const schedules = {
  list(dashboardId) {
    return supabase
      .from('report_schedules')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: false });
  },
  async create(payload) {
    const { data, error } = await supabase.from('report_schedules').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async setActive(id, active) {
    const { error } = await supabase.from('report_schedules').update({ active }).eq('id', id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from('report_schedules').delete().eq('id', id);
    if (error) throw error;
  },
};

export async function runWidgetQuery(datasetId, spec) {
  const { data, error } = await supabase.rpc('run_widget_query', {
    p_dataset_id: datasetId,
    p_spec: spec,
  });
  if (error) throw error;
  return data;
}

export const sharing = {
  async listMembers(dashboardId) {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', dashboardId)
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },
  async inviteMember(dashboardId, email, canEdit = false) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('board_members')
      .insert({ board_id: dashboardId, member_email: email.toLowerCase().trim(), invited_by: uid, can_edit: canEdit })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('That person is already on this board.');
      throw error;
    }
    return data;
  },
  async removeMember(id) {
    const { error } = await supabase.from('board_members').delete().eq('id', id);
    if (error) throw error;
  },
  async getShare(dashboardId) {
    const { data, error } = await supabase
      .from('board_shares')
      .select('*')
      .eq('board_id', dashboardId)
      .eq('revoked', false)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async createShare(dashboardId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('board_shares')
      .insert({ board_id: dashboardId, created_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async revokeShare(id) {
    const { error } = await supabase.from('board_shares').update({ revoked: true }).eq('id', id);
    if (error) throw error;
  },
  async fetchPublicBoard(token) {
    const base = supabase.functions.url('public-board');
    const key = supabase.functions.headers.get('apikey');
    const res = await fetch(base, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `Could not load the board (${res.status})`);
    }
    return res.json();
  },
};

async function callFunction(name, body, headers = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const base = supabase.functions.url(name);
  const key = supabase.functions.headers.get('apikey');
  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: key, ...headers },
    body,
  });
  if (!res.ok) {
    let msg = `Export failed (${res.status})`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {

    }
    throw new Error(msg);
  }
  return res;
}

export async function importFile(file, name) {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  const res = await callFunction('import-file', form);
  return res.json();
}

export async function importSheetsUrl(url, name) {
  const res = await callFunction('import-file', JSON.stringify({ sheetsUrl: url, name }), {
    'Content-Type': 'application/json',
  });
  return res.json();
}

export async function exportPdf({ dashboardId, widgetIds, name, kpis, charts }) {
  const res = await callFunction('export-report', JSON.stringify({ dashboardId, widgetIds, name, format: 'pdf', kpis, charts }), {
    'Content-Type': 'application/json',
  });
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `report.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportReport({ dashboardId, widgetIds, name, format }) {
  const res = await callFunction('export-report', JSON.stringify({ dashboardId, widgetIds, name, format }), {
    'Content-Type': 'application/json',
  });
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `report.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const reports = {
  list() {
    return supabase
      .from('reports')
      .select('*, dashboards(name)')
      .order('created_at', { ascending: false });
  },
};

export const INVOICE_ITEM_PRESETS = [
  { description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 },
];

export const invoices = {
  list() {
    return supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });
  },
  async create(payload) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...payload, owner_id: uid })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('You already have an invoice with this number. Please use a different number.');
      throw error;
    }
    return data;
  },
  async update(id, patch) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('You already have an invoice with this number. Please use a different number.');
      throw error;
    }
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
};

export function computeInvoiceTotals(items, interState = false) {
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const lines = (items ?? []).map((it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const gstRate = Number(it.gstRate) || 0;
    const lineTaxable = qty * rate;
    const lineGst = (lineTaxable * gstRate) / 100;
    taxable += lineTaxable;
    if (interState) igst += lineGst;
    else {
      cgst += lineGst / 2;
      sgst += lineGst / 2;
    }
    return { ...it, qty, rate, gstRate, lineTaxable, lineGst };
  });
  const total = taxable + cgst + sgst + igst;
  return {
    lines,
    taxable: round2(taxable),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    total: round2(total),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ` ${ONES[o]}` : '');
}

export function amountInWords(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return `${parts.join(' ')} Rupees Only`;
}
