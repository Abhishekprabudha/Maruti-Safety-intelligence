const state = {
  data: null,
  scenarioTimer: null,
  scenarioStep: 0,
  scenarioStarted: false,
  activeEventId: null,
  riskPointer: 64,
  incidentGenerated: false,
  overlayAnimation: null,
  tickTimer: null
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function fmt(value, suffix = '') {
  if (typeof value !== 'number') return `${value}${suffix}`;
  const fixed = Number.isInteger(value) ? value : value.toFixed(1);
  return `${fixed}${suffix}`;
}

async function loadData() {
  try {
    const res = await fetch('data/demo-data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    initApp();
  } catch (err) {
    document.body.innerHTML = `<main class="load-error"><h1>Could not load data/demo-data.json</h1><p>This demo fetches local JSON. Open it through GitHub Pages, VS Code Live Server, Vite, or <code>python -m http.server</code> instead of double-clicking the HTML file.</p><pre>${err.message}</pre></main>`;
  }
}

function initApp() {
  renderScenarioSteps();
  renderKPIs();
  renderPlants();
  renderEvents();
  renderRisk();
  renderIncident();
  renderTimeline();
  renderCapa();
  renderCompliance();
  renderCopilot();
  renderEvidence();
  drawRiskTrendChart();
  drawImpactChart();
  wireInteractions();
  setupVideo();
  startLiveTicks();
}

function wireInteractions() {
  $$('.nav-link').forEach(btn => {
    btn.onclick = () => {
      $$('.nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  $('#startScenarioBtn').onclick = startScenario;
  $('#resetScenarioBtn').onclick = resetScenario;
  $('#exportJsonBtn').onclick = exportEvidenceJson;
  $('#importJsonInput').onchange = importJson;
  $('#createIncidentBtn').onclick = generateIncidentPack;

  $('#copilotForm').onsubmit = (e) => {
    e.preventDefault();
    const input = $('#copilotInput');
    const q = input.value.trim();
    if (!q) return;
    askCopilot(q);
    input.value = '';
  };

  $$('#quickPrompts .prompt-btn').forEach(btn => {
    btn.onclick = () => askCopilot(btn.dataset.q);
  });
}

function renderScenarioSteps() {
  $('#scenarioSteps').innerHTML = state.data.scenario.script.map((text, i) => {
    const [headline, ...rest] = text.split('.');
    return `<div class="step-card" data-step="${i}">
      <div class="step-index">${i + 1}</div>
      <strong>${headline}</strong>
      <p>${rest.join('.').trim()}</p>
    </div>`;
  }).join('');
}

function renderKPIs() {
  const k = state.data.scenario.kpis;
  const cards = [
    ['Near misses predicted', k.nearMissesPredicted, '', '+12 vs baseline', 'warn'],
    ['Report draft time', k.avgReportTimeMinutes, ' min', `↓ from ${k.manualReportTimeMinutes} min`, ''],
    ['Auto-doc rate', k.autoDocumentationRate, '%', 'Incident pack pre-filled', ''],
    ['Compliance readiness', k.complianceReadiness, '%', 'Cross-site tracker', ''],
    ['DPDP redaction', k.dpdpRedactionCoverage, '%', 'Guardrails active', ''],
    ['Audit pack complete', k.auditPackCompleteness, '%', 'Ready for review', '']
  ];
  $('#kpiGrid').innerHTML = cards.map(([label, value, suffix, trend, tone]) => `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${fmt(value, suffix)}</div>
      <div class="kpi-trend ${tone || ''}">${trend}</div>
    </article>`).join('');
}

function renderPlants() {
  $('#plantGrid').innerHTML = state.data.plants.map(p => {
    const chipClass = p.riskScore >= 70 ? 'danger' : p.riskScore >= 62 ? 'warn' : 'green';
    return `<article class="plant-card">
      <div class="plant-top">
        <div>
          <div class="plant-name">${p.name}</div>
          <div class="plant-meta">${p.focus}</div>
        </div>
        <span class="status-chip ${chipClass}">${p.status}</span>
      </div>
      <div class="bar"><div style="width:${p.riskScore}%"></div></div>
      <div class="plant-metrics">
        <div class="plant-metric"><span class="plant-meta">Risk</span><b>${p.riskScore}%</b></div>
        <div class="plant-metric"><span class="plant-meta">Near misses</span><b>${p.nearMisses}</b></div>
        <div class="plant-metric"><span class="plant-meta">Open CAPA</span><b>${p.openActions}</b></div>
        <div class="plant-metric"><span class="plant-meta">Readiness</span><b>${p.readiness}%</b></div>
      </div>
      <p class="muted small"><strong>Primary risk:</strong> ${p.primaryRisk}</p>
    </article>`;
  }).join('');
}

function renderEvents() {
  $('#eventStrip').innerHTML = state.data.events.map(evt => `
    <article class="event-card ${evt.id === state.activeEventId ? 'active' : ''}" data-event="${evt.id}">
      <strong>${evt.type}</strong>
      <div class="muted small">${evt.time} · ${evt.plant} · ${evt.zone}</div>
      <p class="muted small">${evt.summary}</p>
      <span class="pill ${evt.severity === 'High' ? 'high' : 'medium'}">${evt.severity} · ${evt.confidence}%</span>
    </article>`).join('');
}

function renderRisk() {
  const latest = state.data.riskTrend[state.riskPointer] || state.data.riskTrend.at(-1);
  const score = Math.round(latest.riskScore);
  $('#riskScore').textContent = score;
  const arc = $('#riskArc');
  if (arc) arc.style.strokeDashoffset = String(270 - (270 * score / 100));
  const status = $('#riskStatus');
  status.textContent = score >= 76 ? 'High' : score >= 62 ? 'Elevated' : 'Stable';
  status.className = `status-chip ${score >= 76 ? 'danger' : score >= 62 ? 'warn' : 'green'}`;

  $('#riskInsights').innerHTML = state.data.riskInsights.map((i, idx) => `
    <div class="insight">
      <strong>${i.title}</strong>
      <p class="muted">${i.body}</p>
      ${idx === 1 ? `<span class="pill ${score >= 70 ? 'high' : 'medium'}">Current score ${score}%</span>` : ''}
    </div>`).join('');
}

function renderIncident() {
  const incident = state.data.incident;
  const fields = [
    ['Incident ID', incident.id],
    ['Title', incident.title],
    ['Plant / Zone', `${incident.plant} · ${incident.zone}`],
    ['Time', incident.time],
    ['Severity', incident.severity],
    ['Classification', incident.classification],
    ['Redaction', incident.redaction],
    ['Evidence', incident.evidence],
    ['Status', state.incidentGenerated ? 'Generated and ready for EHS supervisor approval' : incident.status]
  ];
  $('#incidentCard').innerHTML = fields.map(([label, value]) => `<div class="incident-field"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderTimeline() {
  $('#incidentTimeline').innerHTML = state.data.timeline.map(t => `
    <div class="timeline-item">
      <div class="timeline-time">${t.time}</div>
      <div><strong>${t.label}</strong><p class="muted small">${t.detail}</p></div>
    </div>`).join('');
}

function renderCapa() {
  $('#capaList').innerHTML = state.data.capa.map(c => `
    <div class="capa-item">
      <div class="capa-row"><span>${c.id}</span><span>${c.due}</span></div>
      <strong>${c.title}</strong>
      <div class="capa-row"><span>${c.owner}</span><span class="pill ${c.priority === 'High' ? 'high' : 'medium'}">${c.priority}</span></div>
    </div>`).join('');
}

function renderCompliance() {
  const rows = state.data.complianceMatrix.map(r => `
    <tr>
      <td><strong>${r.standard}</strong><br><span class="muted small">Risk: ${r.risk}</span></td>
      <td>${r.whyItMatters}</td>
      <td>${r.imsControl}</td>
      <td>${r.evidence}</td>
      <td><span class="pill ${r.status === 'Control active' ? 'green' : 'medium'}">${r.status}</span></td>
    </tr>`).join('');
  $('#complianceTable').innerHTML = `<thead><tr><th>Standard / theme</th><th>Why it matters</th><th>AIonOS IMS control</th><th>Evidence generated</th><th>Status</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderCopilot() {
  const prompts = state.data.knowledgeQuestions.map(q => q.q);
  $('#quickPrompts').innerHTML = prompts.slice(0, 5).map(q => `<button class="prompt-btn" type="button" data-q="${escapeHtml(q)}">${q}</button>`).join('');
  $('#chatWindow').innerHTML = `<div class="msg bot"><strong>IMS Copilot ready.</strong><br>Ask about near-miss evidence, DPDP controls, cross-site compliance, or the first recommended safety action.</div>`;
}

function askCopilot(question) {
  const chat = $('#chatWindow');
  chat.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(question)}</div>`);
  const answer = findAnswer(question);
  chat.insertAdjacentHTML('beforeend', `<div class="msg bot">${answer.a}<div class="source">Source: ${answer.source}</div></div>`);
  chat.scrollTop = chat.scrollHeight;
  flashAgent('Safety Copilot answered', `Answered: “${question.slice(0, 72)}${question.length > 72 ? '…' : ''}”`);
}

function findAnswer(question) {
  const q = question.toLowerCase();
  let best = state.data.knowledgeQuestions[0];
  let bestScore = -1;
  state.data.knowledgeQuestions.forEach(item => {
    const text = `${item.q} ${item.a}`.toLowerCase();
    const score = q.split(/\W+/).filter(word => word.length > 2 && text.includes(word)).length;
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return best;
}

function renderEvidence() {
  $('#auditTrail').innerHTML = state.data.auditTrail.map(a => `
    <div class="doc-card"><strong>${a.time} · ${a.actor}</strong><p>${a.action}</p><div class="doc-meta">Hash ${a.hash}</div></div>`).join('');
  $('#evidenceObjects').innerHTML = state.data.evidenceObjects.map(e => `
    <div class="doc-card"><strong>${e.name}</strong><p>${e.description}</p><div class="doc-meta">Owner: ${e.owner} · Retention: ${e.retention}</div></div>`).join('');
  $('#dpdpControls').innerHTML = state.data.dpdpControls.map(c => `
    <div class="doc-card"><strong>${c.control}</strong><p>${c.description}</p></div>`).join('');
  $('#impactInsights').innerHTML = [
    ['42 → 6 min report draft', 'The synthetic scenario pre-fills incident facts, evidence, redaction and compliance mapping.'],
    ['One taxonomy across plants', 'Gurgaon, Manesar and Gujarat can compare near-miss patterns without spreadsheet reconciliation.'],
    ['Evidence before escalation', 'IMS builds the audit trail before memory, screenshots and manual notes diverge.']
  ].map(([h,p]) => `<div class="insight"><strong>${h}</strong><p class="muted">${p}</p></div>`).join('');
}

function generateIncidentPack() {
  state.incidentGenerated = true;
  renderIncident();
  flashAgent('Incident pack generated', 'Documentation Agent drafted the near-miss report, attached video evidence, mapped standards and activated DPDP redaction controls.');
}

function startScenario() {
  clearInterval(state.scenarioTimer);
  state.scenarioStarted = true;
  state.scenarioStep = 0;
  state.activeEventId = null;
  updateScenarioStep(0);
  const video = $('#demoVideo');
  video.currentTime = 0;
  video.play().catch(() => $('#videoPlayBtn').hidden = false);
  state.scenarioTimer = setInterval(() => {
    const next = Math.min(state.scenarioStep + 1, state.data.scenario.script.length - 1);
    updateScenarioStep(next);
    if (next === 1) state.activeEventId = state.data.events[0].id;
    if (next === 3) generateIncidentPack();
    if (next === 4) askCopilot('How does DPDP affect incident reporting?');
    if (next === 6) clearInterval(state.scenarioTimer);
    renderEvents();
  }, 5200);
}

function resetScenario() {
  clearInterval(state.scenarioTimer);
  state.scenarioStarted = false;
  state.scenarioStep = 0;
  state.activeEventId = null;
  state.incidentGenerated = false;
  $('#agentHeadline').textContent = 'Awaiting plant signal';
  $('#agentSummary').textContent = 'Press “Start Maruti safety scenario” to trigger camera analytics, risk scoring, documentation, compliance mapping and cross-site closure.';
  $('#agentMeterFill').style.width = '5%';
  $('#agentTags').innerHTML = '';
  $$('.step-card').forEach(c => c.classList.remove('active','done'));
  $('#videoStatus').textContent = 'Monitoring';
  $('#videoStatus').className = 'status-chip';
  $('#videoHud').textContent = 'No active violation. Tracking human, vehicle and aisle proximity.';
  renderEvents();
  renderIncident();
}

function updateScenarioStep(step) {
  state.scenarioStep = step;
  $$('.step-card').forEach((card, i) => {
    card.classList.toggle('active', i === step);
    card.classList.toggle('done', i < step);
  });
  const headlines = [
    ['Monitoring started', 'IMS is watching video, plant zones, PPE confidence, shift context and historical risk patterns.', ['Video AI','Plant graph']],
    ['Proximity breach predicted', 'Computer vision identifies a potential human-vehicle conflict in a material movement zone.', ['Near miss','94% confidence']],
    ['Risk causality found', 'Risk Agent links aisle congestion, occlusion, shift handover and dwell-time anomaly.', ['Risk 78%','Intervention']],
    ['Incident report drafted', 'Documentation Agent generates the near-miss pack with timestamps, evidence and redaction status.', ['Auto-doc','DPDP guardrail']],
    ['Compliance mapped', 'Compliance Agent maps evidence to BNVSAP/Bharat NCAP readiness, AIS traceability and DPDP controls.', ['AIS','DPDP','Audit']],
    ['Cross-site queue updated', 'Tracker benchmarks Gurgaon, Manesar and Gujarat and assigns CAPA owners.', ['Gurgaon','Manesar','Gujarat']],
    ['Review ready', 'IMS Supervisor Agent publishes the evidence pack for safety engineering review before escalation.', ['Evidence pack','CAPA ready']]
  ];
  const [h, p, tags] = headlines[step] || headlines[0];
  $('#agentHeadline').textContent = h;
  $('#agentSummary').textContent = p;
  $('#agentMeterFill').style.width = `${8 + ((step + 1) / headlines.length) * 92}%`;
  $('#agentTags').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
  $('#videoStatus').textContent = step >= 1 ? 'Risk active' : 'Monitoring';
  $('#videoStatus').className = `status-chip ${step >= 1 ? 'danger' : ''}`;
  if (step >= 1) $('#videoHud').textContent = 'Proximity warning: predicted path conflict in active material aisle. Recommend andon + marshal intervention.';
}

function flashAgent(headline, summary) {
  $('#agentHeadline').textContent = headline;
  $('#agentSummary').textContent = summary;
  $('#agentMeterFill').style.width = '100%';
}

function startLiveTicks() {
  clearInterval(state.tickTimer);
  state.tickTimer = setInterval(() => {
    if (!state.data) return;
    state.riskPointer = (state.riskPointer + 1) % state.data.riskTrend.length;
    renderRisk();
    drawRiskTrendChart();
  }, 1800);
}

function setupVideo() {
  const video = $('#demoVideo');
  const button = $('#videoPlayBtn');
  const error = $('#videoError');

  video.addEventListener('canplay', () => {
    error.hidden = true;
    video.play().catch(() => button.hidden = false);
  });
  video.addEventListener('error', () => { error.hidden = false; });
  button.addEventListener('click', () => {
    video.play().then(() => button.hidden = true).catch(() => error.hidden = false);
  });
  drawOverlayLoop();
}

function drawOverlayLoop() {
  const canvas = $('#visionOverlay');
  const video = $('#demoVideo');
  if (!canvas || !video) return;
  const ctx = canvas.getContext('2d');
  function frame() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const t = video.currentTime || 0;
    const pulse = (Math.sin(t * 2.4) + 1) / 2;
    const riskOn = state.scenarioStarted && state.scenarioStep >= 1;

    drawZone(ctx, w * 0.08, h * 0.62, w * 0.84, h * 0.18, riskOn ? 'rgba(255,77,109,.24)' : 'rgba(53,217,255,.12)', 'Active material aisle');
    drawBox(ctx, w * (0.18 + pulse * 0.04), h * 0.34, w * 0.16, h * 0.36, riskOn ? '#ff4d6d' : '#35d9ff', 'Worker path');
    drawBox(ctx, w * (0.58 - pulse * 0.03), h * 0.45, w * 0.22, h * 0.25, riskOn ? '#ff9f1c' : '#2df2a3', 'Vehicle / trolley lane');
    drawBox(ctx, w * 0.41, h * 0.54, w * 0.18, h * 0.18, riskOn ? '#ff4d6d' : '#ffd166', riskOn ? 'Predicted conflict' : 'Proximity watch');

    if (riskOn) {
      ctx.strokeStyle = 'rgba(255,77,109,.75)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.31, h * 0.55);
      ctx.lineTo(w * 0.64, h * 0.57);
      ctx.stroke();
      ctx.setLineDash([]);
      drawLabel(ctx, w * 0.38, h * 0.47, `Near-miss risk ${$('#riskScore').textContent}%`, '#ff4d6d');
    }
    state.overlayAnimation = requestAnimationFrame(frame);
  }
  cancelAnimationFrame(state.overlayAnimation);
  frame();
}

function drawZone(ctx, x, y, w, h, color, label) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color.replace('.24', '.7').replace('.12', '.55');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  drawLabel(ctx, x + 10, y + 12, label, '#35d9ff');
}

function drawBox(ctx, x, y, w, h, color, label) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.stroke();
  drawLabel(ctx, x, Math.max(8, y - 28), label, color);
}

function drawLabel(ctx, x, y, text, color) {
  ctx.font = '700 12px Inter, sans-serif';
  const pad = 7;
  const metrics = ctx.measureText(text);
  ctx.fillStyle = 'rgba(3,7,13,.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, metrics.width + pad * 2, 24, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x + pad, y + 16);
}

function drawRiskTrendChart() {
  const canvas = $('#riskTrendChart');
  const points = state.data.riskTrend.slice(Math.max(0, state.riskPointer - 48), state.riskPointer + 1);
  drawLines(canvas, points, [
    { key: 'riskScore', label: 'Risk score', min: 0, max: 100, color: '#ff4d6d' },
    { key: 'trafficDensity', label: 'Aisle density', min: 0, max: 100, color: '#35d9ff' },
    { key: 'ppeConfidence', label: 'PPE confidence', min: 70, max: 100, color: '#2df2a3' }
  ], 'Near-miss predictors · last 4 hours');
}

function drawImpactChart() {
  const canvas = $('#impactChart');
  const items = state.data.impact;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height, pad = 34;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...items.map(i => i.before)) * 1.2;
  items.forEach((item, i) => {
    const y = pad + i * ((h - pad * 2) / items.length) + 10;
    const rowH = 28;
    const beforeW = (w - 170) * item.before / max;
    const afterW = (w - 170) * item.after / max;
    ctx.fillStyle = 'rgba(255,77,109,.50)'; ctx.fillRect(128, y, beforeW, rowH);
    ctx.fillStyle = 'rgba(53,217,255,.72)'; ctx.fillRect(128, y + rowH + 6, afterW, rowH);
    ctx.fillStyle = 'rgba(234,242,251,.88)'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(item.label, 12, y + 18);
    ctx.fillText(`${item.before}m`, 132 + beforeW, y + 18);
    ctx.fillText(`${item.after}m`, 132 + afterW, y + rowH + 24);
  });
  ctx.fillStyle = 'rgba(234,242,251,.82)'; ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Manual effort before vs AIonOS IMS after · minutes', 12, 18);
}

function drawLines(canvas, points, series, title) {
  if (!canvas || !points.length) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height, pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(143,164,184,.18)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + (h - pad * 2) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  series.forEach(s => {
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = 2.3;
    points.forEach((p, i) => {
      const v = p[s.key];
      const x = pad + (w - pad * 2) * (points.length <= 1 ? 0 : i / (points.length - 1));
      const y = h - pad - ((v - s.min) / (s.max - s.min)) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.fillStyle = 'rgba(234,242,251,.82)'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(title, pad, 18);
}

function exportEvidenceJson() {
  const payload = JSON.parse(JSON.stringify(state.data));
  payload.scenarioState = {
    scenarioStarted: state.scenarioStarted,
    scenarioStep: state.scenarioStep,
    activeEventId: state.activeEventId,
    incidentGenerated: state.incidentGenerated,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'maruti-ims-evidence-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.data = JSON.parse(reader.result);
      state.riskPointer = Math.min(64, state.data.riskTrend.length - 1);
      resetScenario();
      initApp();
      flashAgent('JSON evidence imported', 'The IMS command center has been reproduced from the imported JSON file.');
    } catch (e) {
      alert('Invalid JSON file: ' + e.message);
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

loadData();
