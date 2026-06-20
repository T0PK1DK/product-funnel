# Nova Audio — Product Funnel

A small, self-contained product sales funnel built with plain HTML, CSS, and JavaScript. No build step, no dependencies.

## The funnel flow
1. `index.html` — Landing page (hero, benefits, how-it-works, testimonials, limited-time offer, FAQ, CTAs).
2. `products.html` — Product grid with **Add to cart**.
3. `checkout.html` — Live order summary (edit quantities / remove) + contact, shipping, and payment form.
4. `thank-you.html` — Order confirmation with order number and a post-purchase upsell.

The cart persists across pages using `localStorage`, so the whole flow works without a server.

## Run it
Just open `index.html` in a browser. For best results (so all relative paths resolve cleanly), serve the folder:

```powershell
# Option A: Python
python -m http.server 8000

# Option B: Node
npx serve .
```

Then visit `http://localhost:8000`.

## Customize
- **Products / prices:** edit the `PRODUCTS` array at the top of `js/main.js`.
- **Discount:** change `DISCOUNT_RATE` in `js/main.js` (default `0.20` = 20%).
- **Brand / colors:** edit the CSS variables in `:root` at the top of `css/styles.css`.
- **Copy & sections:** edit the HTML directly in each page.
- **Product images:** the demo uses emoji placeholders (`emoji` field). Swap the `.product__media` / `.pcard__media` markup for `<img>` tags to use real photos.

## Notes
This is a front-end demo only — **no real payments are processed** and no data leaves the browser. To make it production-ready you'd connect the checkout form to a payment provider (e.g. Stripe Checkout) and an order backend.
