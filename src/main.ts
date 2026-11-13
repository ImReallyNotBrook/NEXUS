import "./style.css";
import { evaluateQualification } from "./domain/qualification";
import { rsi } from "./domain/indicators";
import { fetchBinanceCandles } from "./adapters/binance-public";

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
      <article class="panel market-panel">
        <span class="panel-label">MARKET INTELLIGENCE</span>
        <div class="market-heading"><h2>BTC / USDT</h2><span class="tag safe">PUBLIC DATA</span></div>
        <strong class="market-value" id="btc-price">—</strong>
        <p id="btc-change" class="market-change">Waiting for market data</p>
        <div class="market-metrics"><span>RSI (14)</span><strong id="btc-rsi">—</strong></div>
        <div class="market-footer"><span id="market-updated">No snapshot loaded</span><button id="refresh-market" class="refresh-button" type="button">Refresh</button></div>
      </article>
      <article class="panel"><span class="panel-label">STRATEGY LAB</span><h2>Qualification gate</h2><p>90 qualifying days and 1,000 completed trades are both mandatory.</p><div class="progress"><span style="width:0%"></span></div><p class="small">0 / 90 days · 0 / 1,000 trades</p></article>
      <article class="panel"><span class="panel-label">EXECUTION CONTROL</span><h2>Live trading disabled</h2><p>Qualification can request human review. It cannot grant execution permission.</p><span class="tag safe">LIVE EXECUTION LOCKED</span></article>
      <article class="panel"><span class="panel-label">SYSTEM STATUS</span><h2>Core safeguards</h2><ul><li>Paper trading only</li><li>AI changes require approval</li><li>Backtest integrity enforced</li></ul></article>
    </section>
    <footer> NEXUS v0.1.0 <span>BUILDING THE EVIDENCE ENGINE</span></footer>
  </main>
`;

document.documentElement.dataset.qualificationReady = String(!result.qualified);

const priceElement = document.querySelector<HTMLElement>("#btc-price");
const changeElement = document.querySelector<HTMLElement>("#btc-change");
const rsiElement = document.querySelector<HTMLElement>("#btc-rsi");
const updatedElement = document.querySelector<HTMLElement>("#market-updated");
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh-market");

async function loadMarketSnapshot(): Promise<void> {
  if (!priceElement || !changeElement || !rsiElement || !updatedElement || !refreshButton) return;
  refreshButton.disabled = true;
  refreshButton.textContent = "Loading…";
  changeElement.textContent = "Fetching latest completed hourly candles";
  try {
    const candles = await fetchBinanceCandles({ symbol: "BTCUSDT", interval: "1h", limit: 25 });
    if (candles.length < 15) throw new Error("Not enough completed candles to calculate RSI");
    const firstClose = candles[0].close;
    if (firstClose <= 0) throw new Error("Invalid reference price in market data");
    const last = candles[candles.length - 1];
    const change = ((last.close - firstClose) / firstClose) * 100;
    const rsiValues = rsi(candles.map((candle) => candle.close), 14);
    const latestRsi = rsiValues[rsiValues.length - 1];

    priceElement.textContent = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(last.close) + " USDT";
    changeElement.textContent = (change >= 0 ? "+" : "") + change.toFixed(2) + "% over 24 hourly intervals";
    changeElement.dataset.direction = change >= 0 ? "up" : "down";
    rsiElement.textContent = latestRsi === null ? "—" : latestRsi.toFixed(1);
    updatedElement.textContent = "Last closed candle · " + new Date(last.timestamp).toLocaleString();
  } catch (error) {
    changeElement.textContent = error instanceof Error ? error.message : "Market data unavailable";
    changeElement.dataset.direction = "neutral";
    rsiElement.textContent = "—";
    updatedElement.textContent = "Check connection or retry";
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh";
  }
}

refreshButton?.addEventListener("click", () => { void loadMarketSnapshot(); });
void loadMarketSnapshot();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
