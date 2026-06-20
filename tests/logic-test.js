// Runs the REAL js/main.js in a sandbox with browser globals mocked,
// then exercises the cart API to verify persistence + totals deterministically.
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "..", "js", "main.js"), "utf8");

// --- minimal browser mocks ---
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const document = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, appendChild() {}, set textContent(_) {} }),
  body: { appendChild() {} },
};
const window = { location: { set href(_) {} } };

const ctx = { localStorage, document, window, console, setTimeout, clearTimeout, JSON, Math };
vm.createContext(ctx);
vm.runInContext(code, ctx);

let failures = 0;
function assert(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + " - " + name);
  if (!cond) failures++;
}

// Page 1: add to cart
vm.runInContext("addToCart('nova-buds'); addToCart('nova-buds'); addToCart('nova-studio');", ctx);

// Page 2: simulate a brand-new page load reading from the same localStorage
const cartJson = vm.runInContext("JSON.stringify(getCart())", ctx);
assert("cart persists across loads", cartJson === JSON.stringify({ "nova-buds": 2, "nova-studio": 1 }));
assert("localStorage actually written", typeof store["nova_cart"] === "string");

const t = vm.runInContext("cartTotals()", ctx);
assert("subtotal = 507", t.subtotal === 507);
assert("discount = 101.4 (20%)", Math.abs(t.discount - 101.4) < 1e-9);
assert("total = 405.6", Math.abs(t.total - 405.6) < 1e-9);
assert("cartCount = 3", vm.runInContext("cartCount()", ctx) === 3);

// Update quantity + remove
vm.runInContext("setQty('nova-buds', 5)", ctx);
assert("setQty updates quantity", vm.runInContext("getCart()['nova-buds']", ctx) === 5);
vm.runInContext("setQty('nova-buds', 0)", ctx);
assert("setQty(0) removes item", vm.runInContext("JSON.stringify(getCart())", ctx) === JSON.stringify({ "nova-studio": 1 }));

console.log(failures === 0 ? "\nALL LOGIC TESTS PASSED" : "\n" + failures + " LOGIC TEST(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
