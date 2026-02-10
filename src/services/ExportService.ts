import * as Haptics from 'expo-haptics';
import { desc } from 'drizzle-orm';
import { db } from '../db/client';
import { entries, type Entry } from '../db/schema';

// --- Color mapping (mirrors lib/colors.ts for HTML context) ---

function scoreHex(score: number): string {
  // Darker, print-friendly colors (readable on white background)
  if (score >= 80) return '#2E8B57'; // dark emerald
  if (score >= 60) return '#3D9B40'; // dark green
  if (score >= 40) return '#C49B00'; // dark gold
  if (score >= 20) return '#D4551A'; // dark orange
  return '#C41048';                  // dark ruby
}

function valueHex(value: number, inverted: boolean): string {
  const eff = inverted ? 11 - value : value;
  // Darker, print-friendly colors (readable on white background)
  if (eff >= 8) return '#2E8B57'; // dark emerald (was #50C878)
  if (eff >= 6) return '#3D9B40'; // dark green   (was #7FD858)
  if (eff >= 4) return '#C49B00'; // dark gold    (was #FFD700)
  if (eff >= 2) return '#D4551A'; // dark orange  (was #FF6B35)
  return '#C41048';               // dark ruby    (was #E0115F)
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Elevated';
  return 'High Risk';
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[+m]} ${+d}`;
}

// --- Score Ring SVG (mirrors ScoreGauge arc) ---

function buildScoreRingSvg(score: number, color: string): string {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const strokeW = 4;
  const startAngle = 135;
  const sweepAngle = 270;
  const progress = Math.max(score / 100, 0.01);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Full arc (background track)
  const endFull = startAngle + sweepAngle;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endFull));
  const y2 = cy + r * Math.sin(toRad(endFull));
  const bgArc = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;

  // Progress arc
  const endProg = startAngle + sweepAngle * progress;
  const x3 = cx + r * Math.cos(toRad(endProg));
  const y3 = cy + r * Math.sin(toRad(endProg));
  const largeArc = sweepAngle * progress > 180 ? 1 : 0;
  const progArc = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x3} ${y3}`;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <path d="${bgArc}" fill="none" stroke="#E8E8E8" stroke-width="1" stroke-linecap="round"/>
      <path d="${progArc}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" filter="url(#glow)"/>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
    </svg>`;
}

// --- SVG Chart Builder ---

function buildSvgChart(data: Entry[]): string {
  const entries7 = data.slice(0, 7).reverse();
  if (entries7.length < 2) return '';

  const w = 500;
  const h = 160;
  const padX = 30;
  const padY = 20;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;

  const pts = entries7.map((e, i) => ({
    x: padX + (i / (entries7.length - 1)) * plotW,
    y: padY + plotH - (e.score / 100) * plotH,
    score: e.score,
    date: e.date,
  }));

  // Build smooth path (quadratic bezier through midpoints)
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    if (i === 0) {
      path += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
    } else {
      path += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
    }
  }
  path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

  // Fill area path
  const fillPath = path + ` L ${pts[pts.length - 1].x} ${h - padY} L ${pts[0].x} ${h - padY} Z`;

  // Gradient stops based on score colors
  const gradStops = pts
    .map((p) => {
      const pct = ((p.x - padX) / plotW) * 100;
      return `<stop offset="${pct}%" stop-color="${scoreHex(p.score)}"/>`;
    })
    .join('\n          ');

  const dots = pts
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${scoreHex(p.score)}" stroke="white" stroke-width="1.5"/>`
    )
    .join('\n        ');

  const labels = pts
    .map(
      (p) =>
        `<text x="${p.x}" y="${h - 4}" fill="#999" font-size="10" text-anchor="middle" font-family="system-ui">${formatDate(p.date)}</text>`
    )
    .join('\n        ');

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          ${gradStops}
        </linearGradient>
        <linearGradient id="fillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          ${pts.map((p) => {
            const pct = ((p.x - padX) / plotW) * 100;
            return `<stop offset="${pct}%" stop-color="${scoreHex(p.score)}" stop-opacity="0.15"/>`;
          }).join('\n          ')}
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${h - padY}" stroke="#E5E5E5" stroke-width="0.5"/>
      <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="#E5E5E5" stroke-width="0.5"/>

      <!-- Fill -->
      <path d="${fillPath}" fill="url(#fillGrad)"/>

      <!-- Line -->
      <path d="${path}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Dots -->
      ${dots}

      <!-- Labels -->
      ${labels}
    </svg>`;
}

// --- Insights Generator ---

function generateInsights(data: Entry[]): string[] {
  if (data.length === 0) return ['Start logging daily to receive personalized insights.'];

  const avg = {
    sleep: data.reduce((s, e) => s + e.sleep, 0) / data.length,
    stress: data.reduce((s, e) => s + e.stress, 0) / data.length,
    diet: data.reduce((s, e) => s + e.diet, 0) / data.length,
    exercise: data.reduce((s, e) => s + e.exercise, 0) / data.length,
    score: data.reduce((s, e) => s + e.score, 0) / data.length,
  };

  const insights: string[] = [];

  if (avg.sleep < 6)
    insights.push('Sleep quality is below optimal. Consider establishing a consistent sleep schedule and limiting screen exposure 60 minutes before rest.');
  else if (avg.sleep >= 8)
    insights.push('Sleep quality is excellent. Your recovery periods are well-optimized for inflammation reduction.');

  // Stress scale: 1=very stressed, 10=calm (inverted for scoring)
  if (avg.stress < 4)
    insights.push('Stress levels appear elevated. Guided breathing exercises (4-7-8 technique) and mindfulness practice may help reduce cortisol-driven inflammation.');
  else if (avg.stress >= 7)
    insights.push('Stress management is outstanding. Low cortisol levels correlate with reduced systemic inflammation.');

  if (avg.diet < 6)
    insights.push('Diet scores suggest room for improvement. Focus on omega-3 rich foods, leafy greens, and reducing processed sugar intake.');
  else if (avg.diet >= 8)
    insights.push('Anti-inflammatory diet adherence is excellent. Continue prioritizing whole foods and omega-3 fatty acids.');

  if (avg.exercise < 5)
    insights.push('Physical activity could be increased. Even 20 minutes of moderate walking has significant anti-inflammatory benefits.');
  else if (avg.exercise >= 8)
    insights.push('Exercise consistency is outstanding. Regular movement is one of the most effective inflammation reducers.');

  if (avg.score >= 80)
    insights.push('Overall inflammation score is in the excellent range. Maintain current lifestyle patterns for long-term wellness.');
  else if (avg.score < 40)
    insights.push('Overall score indicates elevated inflammation risk. Consider consulting a healthcare professional for a comprehensive assessment.');

  return insights.length > 0 ? insights : ['Your scores are balanced. Continue monitoring daily for optimal wellness tracking.'];
}

// --- HTML Template ---

function buildHtml(data: Entry[]): string {
  const latest = data[0];
  const last7 = data.slice(0, 7);
  const color = latest ? scoreHex(latest.score) : '#50C878';
  const label = latest ? scoreLabel(latest.score) : 'N/A';
  const chart = buildSvgChart(data);
  const insights = generateInsights(last7);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const factorRows = last7
    .map((e) => {
      const sC = valueHex(e.sleep, false);
      const stC = valueHex(e.stress, true);
      const dC = valueHex(e.diet, false);
      const exC = valueHex(e.exercise, false);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;color:#222;font-weight:400;">${formatDate(e.date)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;text-align:center;">
            <span style="color:${scoreHex(e.score)};font-weight:600;">${e.score}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;text-align:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${sC};margin-right:6px;vertical-align:middle;"></span>
            <span style="color:${sC};font-weight:600;">${e.sleep}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;text-align:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${stC};margin-right:6px;vertical-align:middle;"></span>
            <span style="color:${stC};font-weight:600;">${e.stress}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;text-align:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${dC};margin-right:6px;vertical-align:middle;"></span>
            <span style="color:${dC};font-weight:600;">${e.diet}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #E8E8E8;text-align:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${exC};margin-right:6px;vertical-align:middle;"></span>
            <span style="color:${exC};font-weight:600;">${e.exercise}</span>
          </td>
        </tr>`;
    })
    .join('');

  const insightItems = insights
    .map(
      (text) => `
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <div style="width:6px;height:6px;border-radius:3px;background:#D4AF37;margin-top:7px;margin-right:12px;flex-shrink:0;"></div>
          <p style="margin:0;font-size:13px;color:#333;line-height:1.6;font-weight:400;">${text}</p>
        </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page { margin: 40px; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      background: #FAFAF8;
      color: #1A1A1A;
      margin: 0;
      padding: 0;
    }
    .page {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px;
      border: 1pt solid #D4AF37;
      border-radius: 4px;
      background: #FFFFFF;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 0.5px solid #E8E8E8;
    }
    .header h1 {
      font-size: 15px;
      font-weight: 400;
      letter-spacing: 8px;
      color: #B8962E;
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .header .date {
      font-size: 12px;
      font-weight: 400;
      color: #777;
      letter-spacing: 2px;
    }
    .score-section {
      text-align: center;
      margin-bottom: 36px;
    }
    .score-ring-wrap {
      width: 140px;
      height: 140px;
      margin: 0 auto 16px;
      position: relative;
    }
    .score-ring-wrap svg {
      width: 140px;
      height: 140px;
    }
    .score-number {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 42px;
      font-weight: 200;
      color: ${color};
      letter-spacing: -2px;
    }
    .score-unit {
      position: absolute;
      top: 62%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      font-weight: 300;
      color: #999;
      margin-top: 8px;
    }
    .score-label {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 4px;
      color: ${color};
      text-transform: uppercase;
    }
    .section-title {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 3px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .chart-section {
      margin-bottom: 36px;
    }
    .chart-container {
      background: #FAFAF8;
      border: 0.5px solid #F0F0F0;
      border-radius: 8px;
      padding: 16px 8px;
      text-align: center;
    }
    .chart-container svg {
      width: 100%;
      height: auto;
    }
    .breakdown-section {
      margin-bottom: 36px;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .breakdown-table th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #555;
      text-transform: uppercase;
      text-align: center;
      border-bottom: 1.5px solid #E0E0E0;
    }
    .breakdown-table th:first-child {
      text-align: left;
    }
    .insights-section {
      margin-bottom: 24px;
    }
    .insights-box {
      background: #FAFAF8;
      border: 0.5px solid #F0F0F0;
      border-radius: 8px;
      padding: 20px;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 0.5px solid #E8E8E8;
    }
    .footer p {
      font-size: 11px;
      color: #888;
      font-weight: 400;
      letter-spacing: 1px;
      margin: 3px 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>Empire Health Report</h1>
      <div class="date">${dateStr}</div>
    </div>

    <div class="score-section">
      <div class="section-title">Current Inflammation Score</div>
      <div class="score-ring-wrap">
        ${buildScoreRingSvg(latest?.score ?? 0, color)}
        <div class="score-number">${latest?.score ?? '—'}</div>
        <div class="score-unit">/ 100</div>
      </div>
      <div class="score-label">${label}</div>
    </div>

    ${chart ? `
    <div class="chart-section">
      <div class="section-title">7-Day Trend</div>
      <div class="chart-container">
        ${chart}
      </div>
    </div>` : ''}

    <div class="breakdown-section">
      <div class="section-title">Detailed Breakdown</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
            <th>Sleep</th>
            <th>Stress</th>
            <th>Diet</th>
            <th>Exercise</th>
          </tr>
        </thead>
        <tbody>
          ${factorRows}
        </tbody>
      </table>
    </div>

    <div class="insights-section">
      <div class="section-title">Professional Wellness Recommendations</div>
      <div class="insights-box">
        ${insightItems}
      </div>
    </div>

    <div class="footer">
      <p>Generated by Inflammation Score Tracker</p>
      <p>This report is for personal wellness tracking only and does not constitute medical advice.</p>
    </div>
  </div>
</body>
</html>`;
}

// --- Public API ---

export async function generateAndShareReport(): Promise<void> {
  const data = await db
    .select()
    .from(entries)
    .orderBy(desc(entries.date))
    .limit(30);

  if (data.length === 0) {
    throw new Error('No data to export. Log at least one score first.');
  }

  const html = buildHtml(data);

  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');

  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,
    height: 792,
  });

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Empire Health Report',
    UTI: 'com.adobe.pdf',
  });
}
