/* ===========================================================
   Nova Audio — Product Funnel
   Cart logic + page rendering (vanilla JS, no build step)
   =========================================================== */

// --- Product catalog (edit these to sell your own products) ---
const PRODUCTS = [
  {
    id: "nova-buds",
    name: "Nova Buds Pro",
    tagline: "Active noise-cancelling earbuds",
    price: 129,
    compareAt: 159,
    rating: 5,
    reviews: 842,
    emoji: "\uD83C\uDFA7", // 🎧
  },
  {
    id: "nova-studio",
    name: "Nova Studio Headphones",
    tagline: "Over-ear, 40h battery, hi-res audio",
    price: 249,
    compareAt: 299,
    rating: 5,
    reviews: 506,
    emoji: "\uD83C\uDFB5", // 🎵
  },
  {
    id: "nova-boom",
    name: "Nova Boom Speaker",
    tagline: "Portable 360° waterproof speaker",
    price: 89,
    compareAt: 119,
    rating: 4,
    reviews: 1290,
    emoji: "\uD83D\uDD0A", // 🔊
  },
];

const DISCOUNT_RATE = 0.20; // 20% launch discount applied at checkout
const CART_KEY = "nova_cart";
const ORDER_KEY = "nova_last_order";

// --- Helpers ---
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const money = (n) => "$" + Number(n).toFixed(2);
const $ = (sel, root = document) => root.querySelector(sel);

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function cartCount(cart = getCart()) {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}
function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
}
function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
}

function cartTotals(cart = getCart()) {
  let subtotal = 0;
  Object.entries(cart).forEach(([id, qty]) => {
    const p = byId(id);
    if (p) subtotal += p.price * qty;
  });
  const discount = subtotal * DISCOUNT_RATE;
  return { subtotal, discount, total: subtotal - discount };
}

function updateCartBadge() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = cartCount();
}

// --- Toast ---
let toastTimer;
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function stars(n) { return "\u2605".repeat(n) + "\u2606".repeat(5 - n); }

// --- Products grid (products.html) ---
function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  grid.innerHTML = PRODUCTS.map((p) => `
    <article class="product">
      <div class="product__media" style="background:linear-gradient(135deg,#ede9ff,#ffe9e2)">${p.emoji}</div>
      <div class="product__body">
        <div class="product__stars">${stars(p.rating)} <span class="muted">(${p.reviews})</span></div>
        <div class="product__name">${p.name}</div>
        <div class="product__tag">${p.tagline}</div>
        <div class="product__foot">
          <div class="product__price"><s>${money(p.compareAt)}</s>${money(p.price)}</div>
          <button class="btn btn--primary" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.add);
      const p = byId(btn.dataset.add);
      toast(`${p.name} added to cart \u2713`);
      btn.textContent = "Added \u2713";
      setTimeout(() => (btn.textContent = "Add to cart"), 1200);
    });
  });
}

// --- Checkout (checkout.html) ---
function renderCheckout() {
  const wrap = document.getElementById("checkout");
  if (!wrap) return;
  const summary = document.getElementById("order-lines");
  const cart = getCart();
  const ids = Object.keys(cart);

  if (ids.length === 0) {
    wrap.innerHTML = `
      <div class="panel empty" style="grid-column:1 / -1">
        <div class="empty__icon">\uD83D\uDED2</div>
        <h3>Your cart is empty</h3>
        <p class="muted">Add a product to start your order.</p>
        <a class="btn btn--primary" href="products.html">Browse products</a>
      </div>`;
    return;
  }

  summary.innerHTML = ids.map((id) => {
    const p = byId(id); const qty = cart[id];
    return `
      <div class="line" data-line="${id}">
        <div class="line__media">${p.emoji}</div>
        <div class="line__info">
          <div class="line__name">${p.name}</div>
          <div class="qty">
            <button data-dec="${id}" aria-label="Decrease">\u2212</button>
            <span>${qty}</span>
            <button data-inc="${id}" aria-label="Increase">+</button>
          </div>
          <button class="link-remove" data-remove="${id}">Remove</button>
        </div>
        <div class="line__price">${money(p.price * qty)}</div>
      </div>`;
  }).join("");

  const t = cartTotals(cart);
  $("#t-subtotal").textContent = money(t.subtotal);
  $("#t-discount").textContent = "\u2212" + money(t.discount);
  $("#t-total").textContent = money(t.total);

  summary.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", () => { setQty(b.dataset.inc, (cart[b.dataset.inc] || 0) + 1); renderCheckout(); }));
  summary.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", () => { setQty(b.dataset.dec, (cart[b.dataset.dec] || 0) - 1); renderCheckout(); }));
  summary.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => { setQty(b.dataset.remove, 0); renderCheckout(); }));
}

function initCheckoutForm() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const cart = getCart();
    if (Object.keys(cart).length === 0) { toast("Your cart is empty"); return; }

    let ok = true;
    form.querySelectorAll("[required]").forEach((inp) => {
      const valid = inp.checkValidity() && inp.value.trim() !== "";
      inp.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) { toast("Please complete the highlighted fields"); return; }

    const t = cartTotals(cart);
    const order = {
      id: "NOVA-" + Math.floor(1000 + Math.random() * 9000),
      email: form.email.value.trim(),
      name: form.fullname.value.trim(),
      date: new Date().toISOString(),
      items: Object.entries(cart).map(([id, qty]) => {
        const p = byId(id);
        return { name: p.name, emoji: p.emoji, qty, price: p.price, line: p.price * qty };
      }),
      subtotal: t.subtotal, discount: t.discount, total: t.total,
    };
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    localStorage.removeItem(CART_KEY);
    window.location.href = "thank-you.html";
  });
}

// --- Thank you (thank-you.html) ---
function renderConfirmation() {
  const box = document.getElementById("confirmation");
  if (!box) return;
  let order;
  try { order = JSON.parse(localStorage.getItem(ORDER_KEY)); } catch { order = null; }

  if (!order) {
    box.innerHTML = `
      <div class="check">\u2713</div>
      <h1 class="center">Thank you!</h1>
      <p class="center lead">Your order is confirmed. A receipt has been sent to your email.</p>
      <p class="center"><a class="btn btn--primary" href="products.html">Continue shopping</a></p>`;
    return;
  }

  const items = order.items.map((it) => `
    <div class="line">
      <div class="line__media">${it.emoji}</div>
      <div class="line__info">
        <div class="line__name">${it.name}</div>
        <div class="muted">Qty ${it.qty}</div>
      </div>
      <div class="line__price">${money(it.line)}</div>
    </div>`).join("");

  box.innerHTML = `
    <div class="check">\u2713</div>
    <h1 class="center">Thanks, ${order.name.split(" ")[0] || "friend"}! \uD83C\uDF89</h1>
    <p class="center lead">Your order <span class="order-no">#${order.id}</span> is confirmed.
       We sent a receipt to <b>${order.email}</b>.</p>
    <div class="panel" style="margin-top:24px">
      ${items}
      <div class="totals">
        <div class="t-row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
        <div class="t-row discount"><span>Launch discount (20%)</span><span>\u2212${money(order.discount)}</span></div>
        <div class="t-row"><span>Shipping</span><span>Free</span></div>
        <div class="t-row grand"><span>Total paid</span><span>${money(order.total)}</span></div>
      </div>
    </div>
    <p class="center" style="margin-top:24px"><a class="btn btn--ghost" href="products.html">Continue shopping</a></p>`;
}

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  renderProducts();
  renderCheckout();
  initCheckoutForm();
  renderConfirmation();
});
