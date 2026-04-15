export const cancel = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment Cancelled</title>
  <style>
    :root { --bg: #fff7f7; --card: #ffffff; --accent: #ef4444; --muted: #6b7280; --maxw: 760px; }
    html,body{height:100%}
    body { margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: linear-gradient(180deg,#fff7f7 0%, #ffffff 100%); color:#0f172a; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
    .card { width:100%; max-width:var(--maxw); background:var(--card); border-radius:12px; box-shadow:0 6px 24px rgba(2,6,23,0.06); padding:36px; text-align:center; }
    .badge { display:inline-block; padding:10px 14px; background: rgba(239,68,68,0.10); color:var(--accent); border-radius:999px; font-weight:700; margin-bottom:18px; }
    h1 { margin:0 0 8px; font-size:32px; letter-spacing:-0.02em; }
    p.lead { margin:0 0 20px; color:var(--muted); }
    .info { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin:20px 0 28px; }
    .prop { background:#fff; border:1px solid #f5e9e9; padding:12px 16px; border-radius:8px; min-width:160px; text-align:left; }
    .prop .k { color:#9ca3af; font-size:12px; margin-bottom:6px; display:block; }
    .prop .v { font-weight:600; font-size:15px; color:#0f172a; word-break:break-all; }
    .actions { display:flex; gap:12px; justify-content:center; margin-top:8px; }
    .btn { padding:10px 16px; border-radius:10px; font-weight:600; cursor:pointer; border:0; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    .btn-primary { background:var(--accent); color:#fff; }
    .btn-ghost { background:transparent; color:#374151; border:1px solid #e6eef3; }
    footer { margin-top:18px; color:var(--muted); font-size:13px; }
    pre.debug { text-align:left; background:#111827; color:#fee2e2; padding:12px; border-radius:8px; overflow:auto; max-height:240px; white-space:pre-wrap; }
    @media (max-width:520px) {
      .info{flex-direction:column;align-items:stretch}
      .prop{min-width:auto}
    }
  </style>
</head>
<body>
  <main class="card" role="main" aria-labelledby="title">
    <span class="badge">Payment cancelled</span>
    <h1 id="title">Payment not completed</h1>
    <p class="lead">It looks like your payment was cancelled or not processed. You can try again or contact support if you need help.</p>



    <div class="actions">
    
      <a class="btn btn-ghost" id="btnSupport" href="mailto:support@yourdomain.com">Contact support</a>
    </div>

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
            const value = decodeURIComponent(v.replace(/\\+/g, '%20'));
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
      // Default to CANCELLED to reflect this page's purpose
      const status = (params.payment_status || params.status || 'CANCELLED').toUpperCase();

      function setText(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value ?? '—';
      }

      setText('m_payment_id', m_payment_id);
      setText('pf_payment_id', pf_payment_id);
      setText('amount', amount);
      setText('payment_status', status);

      // Hide retry button if there's no sensible checkout route
      const retry = document.getElementById('btnRetry');
      if (!retry) { /* nothing */ }

      // Don't show receipt link for cancelled payments
      const receipt = document.getElementById('btnReceipt');
      if (receipt) {
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