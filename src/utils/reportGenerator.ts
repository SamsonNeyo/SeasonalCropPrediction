import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type ReportItem = {
  id: string;
  sub_county?: string;
  soil_type?: string;
  temperature?: number;
  rainfall?: number;
  season?: any;
  recommendations?: Array<{
    crop: string;
    confidence_score?: number;
    confidence?: number;
    explanation?: string;
    planning?: {
      duration_days?: string;
      harvest_window?: string;
      planning_actions?: string[];
    };
  }>;
  createdAt?: any;
  timestamp?: any;
};

export type ReportOptions = {
  items: ReportItem[];
  userName?: string;
  region?: string;
  subCounty?: string;
  filterYear: number | 'all';
  filterSeason: 'all' | 'First' | 'Second';
};

const formatDate = (item: ReportItem): string => {
  const ts = item.createdAt ?? item.timestamp;
  if (!ts) return '—';
  try {
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const normalizeSeason = (value: any): string => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === '1' || raw.includes('first')) return 'First Season';
  if (raw === '2' || raw.includes('second')) return 'Second Season';
  return String(value || '—');
};

const getTopCrops = (item: ReportItem): string =>
  (item.recommendations || []).slice(0, 3).map((r) => r.crop).filter(Boolean).join(', ') || '—';

const getTopConfidence = (item: ReportItem): string => {
  const top = item.recommendations?.[0];
  if (!top) return '—';
  const score = top.confidence_score ?? top.confidence;
  if (score == null) return '—';
  const pct = score > 1 ? score : score * 100;
  return `${Math.round(pct)}%`;
};

const buildHtml = (opts: ReportOptions): string => {
  const { items, userName, region, subCounty, filterYear, filterSeason } = opts;
  const now = new Date();
  const generatedAt = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const generatedTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const periodLabel =
    [
      filterYear !== 'all' ? `Year: ${filterYear}` : null,
      filterSeason !== 'all' ? `${filterSeason} Season` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'All periods';

  const firstCount = items.filter((i) => normalizeSeason(i.season) === 'First Season').length;
  const secondCount = items.filter((i) => normalizeSeason(i.season) === 'Second Season').length;

  const cropCounts: Record<string, number> = {};
  items.forEach((item) => {
    const top = item.recommendations?.[0]?.crop;
    if (top) cropCounts[top] = (cropCounts[top] || 0) + 1;
  });
  const topCropsHtml = Object.entries(cropCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([crop, n]) => `<span class="badge">${crop} <b>${n}×</b></span>`)
    .join('') || '<span class="muted">—</span>';

  const rows = items
    .map(
      (item, idx) => `
    <tr class="${idx % 2 === 0 ? '' : 'alt'}">
      <td class="c">${idx + 1}</td>
      <td>${formatDate(item)}</td>
      <td>${normalizeSeason(item.season)}</td>
      <td>${item.sub_county || region || '—'}</td>
      <td>${item.soil_type || '—'}</td>
      <td class="c">${item.temperature != null ? `${item.temperature}°C` : '—'}</td>
      <td class="c">${item.rainfall != null ? `${item.rainfall} mm` : '—'}</td>
      <td class="crops">${getTopCrops(item)}</td>
      <td class="c conf">${getTopConfidence(item)}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SmartCrop Report — ${generatedAt}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2a1a;background:#f3f8f4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:980px;margin:0 auto;padding:32px 24px}

/* Header */
.hdr{background:linear-gradient(135deg,#1B5E3C 0%,#2E7D52 100%);border-radius:16px;padding:30px 32px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px}
.brand{display:flex;align-items:center;gap:14px}
.brand-ico{width:52px;height:52px;background:rgba(255,255,255,.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.brand-name{font-size:24px;font-weight:800;letter-spacing:-.5px}
.brand-tag{font-size:13px;opacity:.72;margin-top:3px}
.rpt-meta{text-align:right}
.rpt-title{font-size:17px;font-weight:700}
.rpt-date{font-size:12px;opacity:.8;margin-top:5px}
.rpt-period{display:inline-block;margin-top:9px;background:rgba(255,255,255,.18);border-radius:20px;padding:4px 13px;font-size:12px;font-weight:600;letter-spacing:.3px}

/* User bar */
.ubar{background:#fff;border:1px solid #dceadc;border-radius:12px;padding:14px 20px;margin-bottom:22px;display:flex;gap:28px;flex-wrap:wrap}
.uf-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#7a9a7a;font-weight:700}
.uf-val{font-size:14px;font-weight:700;color:#1B5E3C;margin-top:2px}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:26px}
.stat{background:#fff;border:1px solid #dceadc;border-radius:12px;padding:16px 18px}
.stat-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#7a9a7a;font-weight:700}
.stat-val{font-size:30px;font-weight:800;color:#1B5E3C;margin-top:5px;line-height:1}
.stat-sub{font-size:11px;color:#9aaa9a;margin-top:4px}
.badge{display:inline-block;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:20px;padding:4px 10px;font-size:12px;color:#2E7D52;margin:3px 4px 3px 0}
.badge b{color:#1B5E3C}
.muted{color:#bbb}

/* Section */
.sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.9px;color:#2E7D52;margin-bottom:10px;display:flex;align-items:center;gap:10px}
.sec::after{content:'';flex:1;height:1px;background:#dceadc}

/* Table */
.tbl-wrap{background:#fff;border:1px solid #dceadc;border-radius:12px;overflow:hidden;margin-bottom:28px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
thead{background:#1B5E3C;color:#fff}
th{padding:10px 13px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
th.c{text-align:center}
tbody tr.alt{background:#f3f9f4}
tbody tr:hover{background:#e6f4e9}
td{padding:9px 13px;border-bottom:1px solid #edf5ed;vertical-align:middle}
td.c{text-align:center;color:#4a7a4a;font-weight:600}
td.conf{color:#1B5E3C;font-weight:800}
td.crops{color:#2E7D52;font-weight:500}
tr:last-child td{border-bottom:none}

@page{margin:0}
@media print{
  body{background:#fff;padding:16px}
  .page{padding:0;max-width:100%}
  .hdr{border-radius:0;page-break-inside:avoid}
  .tbl-wrap{border-radius:0}
}
</style>
</head>
<body>
<div class="page">

  <header class="hdr">
    <div class="brand">
      <div class="brand-ico">🌱</div>
      <div>
        <div class="brand-name">SmartCrop</div>
        <div class="brand-tag">AI-Powered Crop Recommendations · Luwero District</div>
      </div>
    </div>
    <div class="rpt-meta">
      <div class="rpt-title">Prediction History Report</div>
      <div class="rpt-date">${generatedAt} at ${generatedTime}</div>
      <div class="rpt-period">${periodLabel}</div>
    </div>
  </header>

  <div class="ubar">
    <div><div class="uf-label">Farmer</div><div class="uf-val">${userName || 'SmartCrop User'}</div></div>
    <div><div class="uf-label">Region</div><div class="uf-val">${region || 'Luwero'}</div></div>
    <div><div class="uf-label">Sub-county</div><div class="uf-val">${subCounty || '—'}</div></div>
    <div><div class="uf-label">Records in report</div><div class="uf-val">${items.length}</div></div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-lbl">Total Analyses</div>
      <div class="stat-val">${items.length}</div>
      <div class="stat-sub">predictions recorded</div>
    </div>
    <div class="stat">
      <div class="stat-lbl">First Season</div>
      <div class="stat-val">${firstCount}</div>
      <div class="stat-sub">Mar – Jun</div>
    </div>
    <div class="stat">
      <div class="stat-lbl">Second Season</div>
      <div class="stat-val">${secondCount}</div>
      <div class="stat-sub">Aug – Dec</div>
    </div>
    <div class="stat">
      <div class="stat-lbl">Top Recommended</div>
      <div style="margin-top:10px">${topCropsHtml}</div>
    </div>
  </div>

  <div class="sec">Prediction Records</div>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th class="c">#</th>
          <th>Date</th>
          <th>Season</th>
          <th>Sub-county</th>
          <th>Soil Type</th>
          <th class="c">Temp</th>
          <th class="c">Rainfall</th>
          <th>Top Crops</th>
          <th class="c">Confidence</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>


</div>
</body>
</html>`;
};

const isMobileWeb = (): boolean =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const downloadReport = async (opts: ReportOptions): Promise<void> => {
  if (Platform.OS === 'web') {
    const html = buildHtml(opts);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      // Only auto-trigger print on desktop — mobile browsers hang on window.print()
      if (!isMobileWeb()) {
        win.onload = () => {
          win.focus();
          win.print();
          win.onafterprint = () => win.close();
        };
      }
    }
    return;
  }

  // Mobile: generate a real PDF from the same HTML and share/save it
  const html = buildHtml(opts);
  const { uri } = await Print.printToFileAsync({ html });
  const dateStr = new Date().toISOString().slice(0, 10);
  const destUri = uri.replace(/[^/]+$/, `SmartCrop_Report_${dateStr}.pdf`);
  // rename for a cleaner share title (expo-print names it randomly)
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri.endsWith('.pdf') ? destUri : uri, {
      mimeType: 'application/pdf',
      dialogTitle: `SmartCrop Report — ${dateStr}`,
      UTI: 'com.adobe.pdf',
    });
  }
};

// ── Single record report ──────────────────────────────────────────────────────

const buildSingleHtml = (
  item: ReportItem,
  opts: { userName?: string; region?: string; subCounty?: string },
): string => {
  const now = new Date();
  const generatedAt = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const generatedTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const recordDate = formatDate(item);
  const season = normalizeSeason(item.season);
  const location = item.sub_county || opts.subCounty || opts.region || '—';

  const recs = item.recommendations || [];
  const recRows = recs
    .map((r, i) => {
      const score = r.confidence_score ?? r.confidence;
      const pct = score == null ? 0 : score > 1 ? Math.round(score) : Math.round(score * 100);
      const barWidth = Math.max(4, Math.min(100, pct));
      return `
      <tr class="${i % 2 === 0 ? '' : 'alt'}">
        <td class="c rank">${i + 1}</td>
        <td class="crop-name">${r.crop || '—'}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${barWidth}%"></div>
          </div>
        </td>
        <td class="c conf">${score != null ? `${pct}%` : '—'}</td>
        <td class="explain">${r.explanation || ''}</td>
      </tr>`;
    })
    .join('');

  const top = recs[0];
  const plan = top?.planning;
  const planHtml = plan
    ? `
    <div class="plan-box">
      <div class="sec">Planting Plan — ${top.crop || 'Top Crop'}</div>
      <div class="plan-grid">
        <div class="plan-item"><div class="plan-lbl">Duration</div><div class="plan-val">${plan.duration_days || '—'} days</div></div>
        <div class="plan-item"><div class="plan-lbl">Harvest window</div><div class="plan-val">${plan.harvest_window || '—'}</div></div>
      </div>
      ${
        (plan.planning_actions || []).length > 0
          ? `<ul class="actions">${(plan.planning_actions || []).map((a) => `<li>${a}</li>`).join('')}</ul>`
          : ''
      }
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SmartCrop Record — ${recordDate}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2a1a;background:#f3f8f4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:780px;margin:0 auto;padding:32px 24px}

.hdr{background:linear-gradient(135deg,#1B5E3C 0%,#2E7D52 100%);border-radius:16px;padding:26px 30px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:22px}
.brand{display:flex;align-items:center;gap:12px}
.brand-ico{width:46px;height:46px;background:rgba(255,255,255,.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.brand-name{font-size:22px;font-weight:800}
.brand-tag{font-size:12px;opacity:.72;margin-top:2px}
.rpt-meta{text-align:right}
.rpt-title{font-size:16px;font-weight:700}
.rpt-date{font-size:11px;opacity:.8;margin-top:4px}
.rpt-badge{display:inline-block;margin-top:7px;background:rgba(255,255,255,.18);border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600}

.ubar{background:#fff;border:1px solid #dceadc;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap}
.uf-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#7a9a7a;font-weight:700}
.uf-val{font-size:13px;font-weight:700;color:#1B5E3C;margin-top:2px}

.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px}
.meta-card{background:#fff;border:1px solid #dceadc;border-radius:10px;padding:12px 14px}
.meta-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#7a9a7a;font-weight:700}
.meta-val{font-size:18px;font-weight:800;color:#1B5E3C;margin-top:3px}

.sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.9px;color:#2E7D52;margin-bottom:10px;display:flex;align-items:center;gap:10px}
.sec::after{content:'';flex:1;height:1px;background:#dceadc}

.tbl-wrap{background:#fff;border:1px solid #dceadc;border-radius:12px;overflow:hidden;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
thead{background:#1B5E3C;color:#fff}
th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
th.c{text-align:center}
tbody tr.alt{background:#f3f9f4}
td{padding:9px 12px;border-bottom:1px solid #edf5ed;vertical-align:middle}
td.c{text-align:center}
td.rank{color:#7a9a7a;font-weight:700;font-size:13px}
td.conf{color:#1B5E3C;font-weight:800;white-space:nowrap}
td.crop-name{font-weight:700;color:#1a2a1a}
td.explain{font-size:11px;color:#6a8a6a;max-width:220px}
tr:last-child td{border-bottom:none}
.bar-wrap{background:#e8f5e9;border-radius:4px;height:7px;width:100%;min-width:60px}
.bar-fill{background:linear-gradient(90deg,#2E7D52,#4CAF50);border-radius:4px;height:100%}

.plan-box{background:#fff;border:1px solid #dceadc;border-radius:12px;padding:16px 18px;margin-bottom:20px}
.plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.plan-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#7a9a7a;font-weight:700}
.plan-val{font-size:14px;font-weight:700;color:#1B5E3C;margin-top:3px}
.actions{padding-left:18px;margin-top:0}
.actions li{font-size:12.5px;color:#2a3a2a;line-height:1.7;padding:1px 0}

.ftr{border-top:1px solid #dceadc;padding-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
@page{margin:0}
@media print{
  body{background:#fff;padding:16px}
  .page{padding:0;max-width:100%}
  .hdr,.tbl-wrap,.plan-box{border-radius:0}
}
</style>
</head>
<body>
<div class="page">

  <header class="hdr">
    <div class="brand">
      <div class="brand-ico">🌱</div>
      <div>
        <div class="brand-name">SmartCrop</div>
        <div class="brand-tag">AI-Powered Crop Recommendations · Luwero District</div>
      </div>
    </div>
    <div class="rpt-meta">
      <div class="rpt-title">Single Prediction Record</div>
      <div class="rpt-date">Generated ${generatedAt} at ${generatedTime}</div>
      <div class="rpt-badge">${season} · ${recordDate}</div>
    </div>
  </header>

  <div class="ubar">
    <div><div class="uf-label">Farmer</div><div class="uf-val">${opts.userName || 'SmartCrop User'}</div></div>
    <div><div class="uf-label">Region</div><div class="uf-val">${opts.region || 'Luwero'}</div></div>
    <div><div class="uf-label">Sub-county</div><div class="uf-val">${location}</div></div>
    <div><div class="uf-label">Season</div><div class="uf-val">${season}</div></div>
  </div>

  <div class="meta-grid">
    <div class="meta-card"><div class="meta-lbl">Soil Type</div><div class="meta-val" style="font-size:14px">${item.soil_type || '—'}</div></div>
    <div class="meta-card"><div class="meta-lbl">Temperature</div><div class="meta-val">${item.temperature != null ? `${item.temperature}°C` : '—'}</div></div>
    <div class="meta-card"><div class="meta-lbl">Rainfall</div><div class="meta-val">${item.rainfall != null ? `${item.rainfall} mm` : '—'}</div></div>
    <div class="meta-card"><div class="meta-lbl">Top Recommendation</div><div class="meta-val" style="font-size:14px">${recs[0]?.crop || '—'}</div></div>
  </div>

  <div class="sec">All Recommendations</div>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th class="c">#</th>
          <th>Crop</th>
          <th>Confidence</th>
          <th class="c">Score</th>
          <th>Why it fits</th>
        </tr>
      </thead>
      <tbody>${recRows}</tbody>
    </table>
  </div>

  ${planHtml}


</div>
</body>
</html>`;
};

export const downloadSingleRecord = async (
  item: ReportItem,
  opts: { userName?: string; region?: string; subCounty?: string } = {},
): Promise<void> => {
  if (Platform.OS === 'web') {
    const html = buildSingleHtml(item, opts);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      if (!isMobileWeb()) {
        win.onload = () => {
          win.focus();
          win.print();
          win.onafterprint = () => win.close();
        };
      }
    }
    return;
  }

  // Mobile: generate a real PDF and share/save it
  const html = buildSingleHtml(item, opts);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `SmartCrop Record — ${formatDate(item)}`,
      UTI: 'com.adobe.pdf',
    });
  }
};
