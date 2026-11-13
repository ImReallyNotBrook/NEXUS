import "./style.css";
import { evaluateQualification } from "./domain/qualification";

const result = evaluateQualification({ qualifyingDays: 0, completedTrades: 0 });
const root = document.querySelector<HTMLDivElement>("#root");

if (!root) throw new Error("Root element #root was not found");

root.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">N</span><span>NEXUS</span></div>
      <span class="status"><i></i> RESEARCH MODE</span>
    </header>
    <section class="hero">
      <p class="eyebrow">TRADING INTELLIGENCE SYSTEM</p>
      <h1>Decisions backed<br/><span>by evidence.</span></h1>
      <p class="intro">A research-first environment for crypto markets, strategy validation and disciplined paper trading.</p>
      <div class="account">
        <div><span class="muted">SIMULATED EQUITY</span><strong>10,000.00 <small>USDT</small></strong></div>
        <span class="paper-pill">PAPER ACCOUNT</span>
      </div>
    </section>
    <section class="grid">
      <article class="panel"><span class="panel-label">MARKET INTELLIGENCE</span><h2>Data layer</h2><p>Public market data adapters are next. No exchange credentials are required.</p><span class="tag">FOUNDATION PENDING</span></article>
      <article class="panel"><span class="panel-label">STRATEGY LAB</span><h2>Qualification gate</h2><p>90 qualifying days and 1,000 completed trades are both mandatory.</p><div class="progress"><span style="width:0%"></span></div><p class="small">0 / 90 days · 0 / 1,000 trades</p></article>
      <article class="panel"><span class="panel-label">EXECUTION CONTROL</span><h2>Live trading disabled</h2><p>Qualification can request human review. It cannot grant execution permission.</p><span class="tag safe">LIVE EXECUTION LOCKED</span></article>
      <article class="panel"><span class="panel-label">SYSTEM STATUS</span><h2>Core safeguards</h2><ul><li>Paper trading only</li><li>AI changes require approval</li><li>Backtest integrity enforced</li></ul></article>
    </section>
    <footer> NEXUS v0.1.0 <span>BUILDING THE EVIDENCE ENGINE</span></footer>
  </main>
`;

document.documentElement.dataset.qualificationReady = String(!result.qualified);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
