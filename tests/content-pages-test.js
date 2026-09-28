// Static-page checks for The Midas Law marketing site (no browser required).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failures = 0;
function assert(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + " - " + name);
  if (!cond) failures++;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const index = read("index.html");
const about = read("about.html");
const privacy = read("privacy.html");
const contact = read("contact.html");
const terms = read("terms.html");
const glossary = read("glossary.html");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const app = read("app/index.html");
const articlesIndex = read("articles/index.html");
const poverty = read("articles/poverty-premium.html");
const paradox = read("articles/emergency-fund-paradox.html");
const debt = read("articles/debt-destruction-playbook.html");
const firstGen = read("articles/first-generation-wealth.html");

assert("no Launch the Web App CTA", !/Launch the Web App/.test(index));
assert("homepage does not link to /app as a launch", !/href="https:\/\/themidaslawbook\.com\/app"/.test(index));
assert("testimonials removed", !/Marcus R\.|Sofia D\.|James T\.|Amara K\.|Liam P\.|Nadia V\./.test(index));
assert("demo footer line removed", !/Demo landing page/.test(index + about + privacy));
assert("no live mailto to domain mailboxes", !/mailto:(hello|privacy)@themidaslawbook\.com/.test(about + privacy + contact + terms + index));
assert("contact form exists", /id="contactForm"/.test(contact));
assert("terms page exists", /Terms of Use/.test(terms));
assert("robots references sitemap", /Sitemap:\s*https:\/\/www\.themidaslawbook\.com\/sitemap\.xml/.test(robots));
assert("sitemap lists glossary", /glossary\.html/.test(sitemap));
assert("sitemap lists terms", /terms\.html/.test(sitemap));
assert("sitemap lists contact", /contact\.html/.test(sitemap));
assert("sitemap lists articles", /articles\/poverty-premium\.html/.test(sitemap));
assert("glossary has APR", /APR \(Annual Percentage Rate\)/.test(glossary));
assert("glossary has HYSA", /High-yield savings account \(HYSA\)/.test(glossary));
assert("glossary has REIT", />REIT</.test(glossary));
assert("poverty chapter uses guide text", /It costs a massive amount of money to be broke in America/.test(poverty));
assert("paradox chapter uses triage blueprint", /The Triage Blueprint/.test(paradox));
assert("debt chapter uses avalanche", /The Avalanche Method/.test(debt));
assert("first-gen chapter uses Family Fund", /the Family Fund/.test(firstGen));
assert("articles hub lists four chapters", /poverty-premium\.html/.test(articlesIndex) && /first-generation-wealth\.html/.test(articlesIndex));
assert("app page is coming soon, not a fake app", /Coming soon/.test(app) && !/Launch the Web App/.test(app));
assert("$19 price unchanged", /\$19/.test(index));
assert("guide PDF still offered", /assets\/books\/The-Midas-Law-Guide\.pdf/.test(index));
assert("workbook PDF still offered", /assets\/books\/The-Midas-Law-Workbook\.pdf/.test(index));

const termCount = (glossary.match(/class="term"/g) || []).length;
assert("glossary has 30 printed entries (401(k)/IRA combined)", termCount === 30);

console.log(failures === 0 ? "\nALL CONTENT PAGE TESTS PASSED" : "\n" + failures + " CONTENT PAGE TEST(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
