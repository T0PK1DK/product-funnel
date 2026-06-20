// Real-browser end-to-end test of the funnel via Chrome DevTools Protocol.
// Requires: headless Chrome running with --remote-debugging-port=9222
//           and the static server running on http://localhost:8137
// Drives actual page loads, clicks the real Add-to-cart buttons, and verifies
// the cart persists across page navigations and through to order confirmation.
const http = require("http");
const BASE = "http://localhost:8137";
const CDP = "http://127.0.0.1:9222";

const getJSON = (url) =>
  new Promise((resolve, reject) => {
    http.get(url, (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve(JSON.parse(d))); }).on("error", reject);
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const ver = await getJSON(`${CDP}/json/version`);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 1;
  const pending = new Map();
  let loadWaiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method === "Page.loadEventFired") {
      const w = loadWaiters.shift();
      if (w) w();
    }
  };
  const send = (method, params = {}, sessionId) => {
    const id = nextId++;
    const m = { id, method, params };
    if (sessionId) m.sessionId = sessionId;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify(m)); });
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  const waitForLoad = (timeout = 4000) =>
    new Promise((resolve) => { let done = false; const f = () => { if (!done) { done = true; resolve(); } }; loadWaiters.push(f); setTimeout(f, timeout); });
  const evalJS = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error("Eval: " + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const waitReady = async () => { for (let i = 0; i < 25; i++) { if ((await evalJS("document.readyState")) === "complete") return; await sleep(80); } };
  const navigate = async (url) => { const p = waitForLoad(); await send("Page.navigate", { url }, sessionId); await p; await waitReady(); };

  let fails = 0;
  const check = (name, cond, extra = "") => { console.log((cond ? "PASS" : "FAIL") + " - " + name + (extra ? "  [" + extra + "]" : "")); if (!cond) fails++; };

  // 0) Landing renders; start from a clean cart
  await navigate(`${BASE}/index.html`);
  check("landing page renders (.hero)", await evalJS("!!document.querySelector('.hero')"));
  await evalJS("localStorage.clear()");

  // 1) Products page renders 3 cards; clicking REAL buttons updates the cart
  await navigate(`${BASE}/products.html`);
  const productCount = await evalJS("document.querySelectorAll('.product').length");
  check("products grid renders 3 cards", productCount === 3, "count=" + productCount);
  const cartJson = await evalJS(
    "document.querySelector('[data-add=nova-buds]').click();" +
    "document.querySelector('[data-add=nova-buds]').click();" +
    "document.querySelector('[data-add=nova-studio]').click();" +
    "localStorage.getItem('nova_cart')"
  );
  check("Add-to-cart buttons write localStorage", cartJson === JSON.stringify({ "nova-buds": 2, "nova-studio": 1 }), cartJson);
  check("cart badge shows 3", (await evalJS("document.getElementById('cart-count').textContent")) === "3");

  // 2) FRESH navigation to checkout reads the persisted cart and renders totals
  await navigate(`${BASE}/checkout.html`);
  check("checkout renders persisted line items", (await evalJS("document.querySelectorAll('#order-lines .line').length")) === 2);
  check("checkout subtotal $507.00", (await evalJS("document.getElementById('t-subtotal').textContent")) === "$507.00", await evalJS("document.getElementById('t-subtotal').textContent"));
  const disc = await evalJS("document.getElementById('t-discount').textContent");
  check("checkout discount 20% = $101.40", disc === "\u2212$101.40" || disc === "-$101.40", disc);
  check("checkout total $405.60", (await evalJS("document.getElementById('t-total').textContent")) === "$405.60", await evalJS("document.getElementById('t-total').textContent"));

  // 3) Complete the purchase -> navigates to thank-you, clears cart, saves order
  const p = waitForLoad();
  await evalJS(
    "(function(){var f=document.getElementById('checkout-form');" +
    "f.email.value='test@example.com';f.fullname.value='Test Buyer';f.address.value='1 Test St';" +
    "f.city.value='Testville';f.zip.value='00000';f.card.value='4242424242424242';f.exp.value='12/30';f.cvc.value='123';" +
    "f.requestSubmit();return true;})()"
  );
  await p; await waitReady();
  check("order submit navigates to thank-you", /thank-you/.test(await evalJS("location.pathname")), await evalJS("location.pathname"));
  check("confirmation shows order number", /^#NOVA-\d{4}$/.test(await evalJS("(document.querySelector('.order-no')||{}).textContent||''")), await evalJS("(document.querySelector('.order-no')||{}).textContent||''"));
  check("cart cleared after purchase", (await evalJS("localStorage.getItem('nova_cart')")) === null);
  check("order saved to localStorage", (await evalJS("!!localStorage.getItem('nova_last_order')")) === true);

  console.log(fails === 0 ? "\nALL BROWSER E2E TESTS PASSED" : "\n" + fails + " BROWSER TEST(S) FAILED");
  await send("Target.closeTarget", { targetId });
  ws.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
