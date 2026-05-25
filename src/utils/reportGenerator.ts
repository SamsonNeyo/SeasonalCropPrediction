import { Platform, Share } from 'react-native';

export type ReportItem = {
  id: string;
  sub_county?: string;
  soil_type?: string;
  temperature?: number;
  rainfall?: number;
  season?: any;
  recommendations?: Array<{ crop: string; confidence_score?: number; confidence?: number }>;
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

/* Footer */
.ftr{border-top:1px solid #dceadc;padding-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.ftr-txt{font-size:11px;color:#aabcaa}
.ftr-brand{font-size:12px;font-weight:700;color:#2E7D52}

@media print{
  body{background:#fff}
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

  <footer class="ftr">
    <div class="ftr-txt">Generated by SmartCrop · ${generatedAt} · ${items.length} record${items.length !== 1 ? 's' : ''} · To save as PDF, use File → Print → Save as PDF</div>
    <div class="ftr-brand">SmartCrop — Luwero Crop Intelligence</div>
  </footer>

</div>
</body>
</html>`;
};

export const downloadReport = async (opts: ReportOptions): Promise<void> => {
  if (Platform.OS === 'web') {
    const html = buildHtml(opts);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `SmartCrop_Report_${dateStr}.html`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Mobile: share a formatted text summary via the native share sheet
  const { items, userName, region, subCounty } = opts;
  const now = new Date();
  const lines = [
    'SmartCrop — Prediction History Report',
    `Generated: ${now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Farmer: ${userName || 'SmartCrop User'}`,
    `Region: ${region || 'Luwero'}${subCounty ? ` · ${subCounty}` : ''}`,
    '',
    '── SUMMARY ─────────────────────────',
    `Total records: ${items.length}`,
    `First Season:  ${items.filter((i) => normalizeSeason(i.season) === 'First Season').length}`,
    `Second Season: ${items.filter((i) => normalizeSeason(i.season) === 'Second Season').length}`,
    '',
    '── RECORDS ─────────────────────────',
    ...items.map((item, idx) =>
      [
        `${String(idx + 1).padStart(2, '0')}. ${formatDate(item)}  |  ${normalizeSeason(item.season)}`,
        `    Location : ${item.sub_county || region || '—'} · ${item.soil_type || '—'}`,
        `    Conditions: ${item.temperature != null ? `${item.temperature}°C` : '—'} · ${item.rainfall != null ? `${item.rainfall} mm` : '—'}`,
        `    Top crops : ${getTopCrops(item)} (${getTopConfidence(item)})`,
      ].join('\n'),
    ),
    '',
    'SmartCrop — Luwero Crop Intelligence',
  ];

  await Share.share({
    message: lines.join('\n'),
    title: `SmartCrop_Report_${now.toISOString().slice(0, 10)}`,
  });
};
