const KEY = 'lm_history';
const PRIV_STORE = 'lm_priv';

const privEl = document.getElementById('priv');
privEl.value = localStorage.getItem(PRIV_STORE) || '';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function save(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}
function money(n) {
  return 'Rs ' + Number(n || 0).toLocaleString('en-PK');
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDur(ms) {
  if (ms <= 0) return '0';
  const d = ms / 86400000;
  if (d >= 1) return Math.round(d * 10) / 10 + ' days';
  const h = ms / 3600000;
  if (h >= 1) return Math.round(h * 10) / 10 + ' hours';
  return Math.round(ms / 60000) + ' min';
}
function computeTill(n, unit) {
  const t = new Date();
  if (unit === 'months') t.setMonth(t.getMonth() + n);
  else if (unit === 'days') t.setDate(t.getDate() + n);
  else if (unit === 'hours') t.setHours(t.getHours() + n);
  else t.setMinutes(t.getMinutes() + n);
  return t;
}
function planLabel(n, unit) {
  const u = unit === 'months' ? 'month' : unit === 'days' ? 'day' : unit === 'hours' ? 'hour' : 'minute';
  return `${n} ${u}${n > 1 ? 's' : ''}`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function copy(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const o = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => (btn.textContent = o), 1200);
    }
  });
}

let lastRec = null;

document.getElementById('gen').addEventListener('click', () => {
  const client = document.getElementById('client').value.trim();
  const device = document.getElementById('device').value.trim();
  const n = Number(document.getElementById('dur').value) || 0;
  const unit = document.getElementById('unit').value;
  const grace = Math.max(0, Number(document.getElementById('grace').value) || 0);
  const price = Math.max(0, Number(document.getElementById('price').value) || 0);

  if (!client || !device || n <= 0) {
    alert('Client, Device ID aur Duration zaroori hain.');
    return;
  }
  const priv = privEl.value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(priv)) {
    alert('Private key (64 hex characters) daalein.');
    return;
  }
  localStorage.setItem(PRIV_STORE, priv);

  const now = new Date();
  const till = computeTill(n, unit);
  const payload = {
    v: 1,
    name: client,
    device,
    till: till.toISOString(),
    plan: planLabel(n, unit),
    iat: now.toISOString(),
    graceDays: grace
  };

  const code = window.LicenseLib.signPayload(payload, priv);
  const rec = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: now.toISOString(),
    client,
    device,
    plan: payload.plan,
    till: till.toISOString(),
    price,
    code,
    durationMs: till - now
  };

  const rows = load();
  rows.unshift(rec);
  save(rows);
  lastRec = rec;
  showOutput(rec);
  render();
});

function showOutput(rec) {
  document.getElementById('out').classList.add('show');
  document.getElementById('oPlan').textContent = rec.plan;
  document.getElementById('oTill').textContent = new Date(rec.till).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  document.getElementById('oPrice').textContent = money(rec.price);
  document.getElementById('oCode').value = rec.code;
}

document.getElementById('copyCode').addEventListener('click', (e) => {
  if (lastRec) copy(lastRec.code, e.currentTarget);
});

function render() {
  const rows = load();

  document.getElementById('histBody').innerHTML =
    rows
      .map(
        (r) => `<tr>
      <td class="muted">${fmtDate(r.createdAt)}</td>
      <td>${esc(r.client)}</td>
      <td><span class="tag">${esc(r.device)}</span></td>
      <td>${esc(r.plan)}</td>
      <td>${new Date(r.till).toLocaleDateString('en-GB')}</td>
      <td class="money">${money(r.price)}</td>
      <td><button class="copy" data-code="${encodeURIComponent(r.code)}">Copy</button></td>
    </tr>`
      )
      .join('') || `<tr><td colspan="7" class="muted" style="text-align:center;padding:18px">Koi activation nahi</td></tr>`;

  document.querySelectorAll('#histBody .copy').forEach((b) =>
    b.addEventListener('click', (e) => copy(decodeURIComponent(b.dataset.code), e.currentTarget))
  );

  document.getElementById('sCount').textContent = rows.length;
  document.getElementById('sAmount').textContent = money(rows.reduce((a, r) => a + (r.price || 0), 0));
  document.getElementById('sDevices').textContent = new Set(rows.map((r) => r.device)).size;

  const map = new Map();
  for (const r of rows) {
    const d = map.get(r.device) || { device: r.device, client: r.client, count: 0, dur: 0, amount: 0 };
    d.count++;
    d.dur += r.durationMs || 0;
    d.amount += r.price || 0;
    d.client = r.client;
    map.set(r.device, d);
  }
  document.getElementById('devBody').innerHTML =
    Array.from(map.values())
      .map(
        (d) => `<tr>
      <td><span class="tag">${esc(d.device)}</span></td>
      <td>${esc(d.client)}</td>
      <td>${d.count}</td>
      <td>${fmtDur(d.dur)}</td>
      <td class="money">${money(d.amount)}</td>
    </tr>`
      )
      .join('') || `<tr><td colspan="5" class="muted" style="text-align:center;padding:18px">—</td></tr>`;
}

document.getElementById('clear').addEventListener('click', () => {
  if (!confirm('Sari activation history delete karein?')) return;
  save([]);
  render();
});

render();
