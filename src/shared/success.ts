// Exportable JS/TS template string (useful if you want to send the HTML from server code)
export const success = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment Successful</title>
  <style>
    :root { --bg: #f6fffa; --card: #ffffff; --accent: #16a34a; --muted: #6b7280; --maxw: 760px; }
    html,body{height:100%}
    body { margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: linear-gradient(180deg,#f0fdf4 0%, #ffffff 100%); color:#0f172a; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
    .card { width:100%; max-width:var(--maxw); background:var(--card); border-radius:12px; box-shadow:0 6px 24px rgba(2,6,23,0.08); padding:36px; text-align:center; }
    .badge { display:inline-block; padding:10px 14px; background: rgba(16,185,129,0.12); color:var(--accent); border-radius:999px; font-weight:600; margin-bottom:18px; }
    h1 { margin:0 0 8px; font-size:32px; letter-spacing:-0.02em; }
    p.lead { margin:0 0 20px; color:var(--muted); }
    .info { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin:20px 0 28px; }
    .prop { background:#f8fafc; border:1px solid #eef2f7; padding:12px 16px; border-radius:8px; min-width:160px; text-align:left; }
    .prop .k { color:#9ca3af; font-size:12px; margin-bottom:6px; display:block; }
    .prop .v { font-weight:600; font-size:15px; color:#0f172a; word-break:break-all; }
    .actions { display:flex; gap:12px; justify-content:center; margin-top:8px; }
    .btn { padding:10px 16px; border-radius:10px; font-weight:600; cursor:pointer; border:0; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    .btn-primary { background:var(--accent); color:#fff; }
    .btn-ghost { background:transparent; color:#374151; border:1px solid #e6eef3; }
    footer { margin-top:18px; color:var(--muted); font-size:13px; }
    pre.debug { text-align:left; background:#111827; color:#d1fae5; padding:12px; border-radius:8px; overflow:auto; max-height:240px; white-space:pre-wrap; }
    @media (max-width:520px) {
      .info{flex-direction:column;align-items:stretch}
      .prop{min-width:auto}
    }
  </style>
</head>
<body>
  <main class="card" role="main" aria-labelledby="title">
    <span class="badge">Payment received</span>
    <h1 id="title">Thank you — payment successful</h1>
    <p class="lead">Your subscription is now active. You will receive a confirmation email shortly.</p>


    <footer>
      If you have any issues, contact support at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.
    </footer>

    <!-- Optional debug block to help during development; remove in production -->
    <pre class="debug" id="debug" style="display:none"></pre>
  </main>

  <script>
    (function () {
      function parseQS() {
        const qs = window.location.search.replace(/^\?/, '');
        if (!qs) return {};
        return qs.split('&').reduce((acc, pair) => {
          const [k, v = ''] = pair.split('=');
          try {
            const key = decodeURIComponent(k);
            const value = decodeURIComponent(v.replace(/\+/g, '%20'));
            acc[key] = value;
          } catch (e) {
            acc[k] = v;
          }
          return acc;
        }, {});
      }

      const params = parseQS();
      const m_payment_id = params.m_payment_id || params.m_paymentid || params.m_payment || '—';
      const pf_payment_id = params.pf_payment_id || params.pf_payment || '—';
      const amount = params.amount || params.amount_gross || params.amount_paid || '—';
      const status = (params.payment_status || params.status || 'COMPLETE').toUpperCase();

      function setText(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value ?? '—';
      }

      setText('m_payment_id', m_payment_id);
      setText('pf_payment_id', pf_payment_id);
      setText('amount', amount);
      setText('payment_status', status);

      const receipt = document.getElementById('btnReceipt');
      if (m_payment_id && m_payment_id !== '—' && receipt) {
        receipt.href = \`/api/v1/payments/receipt?m_payment_id=\${encodeURIComponent(m_payment_id)}\`;
      } else if (receipt) {
        receipt.style.display = 'none';
      }

      if (params.debug === 'true') {
        const dbg = document.getElementById('debug');
        dbg.style.display = 'block';
        dbg.textContent = JSON.stringify(params, null, 2);
      }
    })();
  </script>
</body>
</html>`;