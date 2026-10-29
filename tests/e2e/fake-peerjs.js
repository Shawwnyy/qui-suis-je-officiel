/* Faux réseau PeerJS entre plusieurs pages Playwright (aucun accès Internet nécessaire) :
   le site utilise ses vrais createRoom / joinRoom / handleData ; seul le transport est simulé.
   Nécessite Playwright (npm i -g playwright) — voir tests/e2e/rooms.e2e.js. */
const path = require("path");
let chromium; try { chromium = require("playwright").chromium; } catch (e) { chromium = null; }
const INIT = `
(function(){
  if (window.__mockNet) return; window.__mockNet = true;
  window.__peers = {}; window.__conns = {}; window.__log = [];
  function Conn(peer, cid, local, remote, outgoing){ this.peer = remote; this.cid = cid; this.open = false; this.h = {}; this._local = local; this.outgoing = outgoing; this.closed = false; }
  Conn.prototype.on = function(e, f){ (this.h[e] = this.h[e] || []).push(f); return this; };
  Conn.prototype.removeAllListeners = function(e){ if (e) this.h[e] = []; else this.h = {}; return this; };
  Conn.prototype.emit = function(e, a){ (this.h[e] || []).slice().forEach(function(f){ try { f(a); } catch (err) { console.error('handler ' + e + ': ' + (err && err.stack || err)); } }); };
  Conn.prototype.send = function(d){ if (!this.open) throw new Error('not open'); window.__net('data', { from: this._local, to: this.peer, cid: this.cid, payload: JSON.stringify(d) }); };
  Conn.prototype.close = function(){ if (this.closed) return; this.closed = true; this.open = false; window.__net('close', { from: this._local, to: this.peer, cid: this.cid }); this.emit('close'); };
  function Peer(id){
    this.id = id || ('g' + Math.random().toString(36).slice(2, 8)); this.h = {}; this.destroyed = false; var self = this;
    window.__peers[this.id] = this;
    setTimeout(function(){ window.__net('register', { id: self.id }).then(function(){ self.emit('open', self.id); }); }, 5);
  }
  Peer.prototype.on = function(e, f){ (this.h[e] = this.h[e] || []).push(f); return this; };
  Peer.prototype.emit = function(e, a){ (this.h[e] || []).slice().forEach(function(f){ try { f(a); } catch (err) { console.error('peer ' + e + ': ' + (err && err.stack || err)); } }); };
  Peer.prototype.connect = function(to){
    var cid = 'c' + Math.random().toString(36).slice(2, 8); var c = new Conn(this, cid, this.id, to, true); window.__conns[cid + ':' + this.id] = c; var self = this;
    window.__net('connect', { from: this.id, to: to, cid: cid }).then(function(ok){ if (!ok) { self.emit('error', { type: 'peer-unavailable', message: 'Could not connect to peer ' + to }); } else { c.open = true; c.emit('open'); } });
    return c;
  };
  Peer.prototype.destroy = function(){ this.destroyed = true; var self = this; Object.keys(window.__conns).forEach(function(k){ if (k.endsWith(':' + self.id)) { try { window.__conns[k].close(); } catch (e) {} } }); window.__net('unregister', { id: this.id }); delete window.__peers[this.id]; };
  window.Peer = Peer;
  window.__incoming = function(m){
    var P = window.__peers[m.to]; if (!P) return false;
    if (m.kind === 'connect') { var c = new Conn(P, m.cid, m.to, m.from, false); window.__conns[m.cid + ':' + m.to] = c; P.emit('connection', c); setTimeout(function(){ c.open = true; c.emit('open'); }, 0); return true; }
    var c2 = window.__conns[m.cid + ':' + m.to]; if (!c2) return false;
    if (m.kind === 'data') { window.__log.push({ from: m.from, d: JSON.parse(m.payload) }); c2.emit('data', JSON.parse(m.payload)); }
    if (m.kind === 'close') { c2.closed = true; c2.open = false; c2.emit('close'); }
    return true;
  };
})();`;
async function boot(opts) {
  opts = opts || {};
  if (!chromium) return null;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
  const reg = {}; const errs = []; const pages = {};
  async function route(source, m) { const t = reg[m.to]; if (!t) return false; try { return await t.evaluate(x => window.__incoming(x), m); } catch (e) { return false; } }
  async function newPage(name) {
    const page = await ctx.newPage(); pages[name] = page;
    page.on("pageerror", e => errs.push(name + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(name + " console: " + m.text()); });
    page.on("dialog", d => { errs.push(name + " dialog: " + d.message()); d.dismiss(); });
    await page.exposeBinding("__net", async (source, kind, m) => {
      if (kind === "register") { reg[m.id] = source.page; return true; }
      if (kind === "unregister") { delete reg[m.id]; return true; }
      if (kind === "connect") return route(source, Object.assign({ kind: "connect" }, m));
      if (kind === "data") return route(source, Object.assign({ kind: "data" }, m));
      if (kind === "close") return route(source, Object.assign({ kind: "close" }, m));
    });
    await page.route(/^https?:\/\/(?!file)/, r => r.abort());
    await page.addInitScript(INIT.replace(/window\.__net\(/g, "window.__netCall("));
    await page.addInitScript("window.__netCall = function(kind, m){ return window.__net(kind, m); };");
    await page.goto("file://" + path.resolve(__dirname, "../../index.html")); await page.waitForTimeout(700);
    return page;
  }
  return { browser, ctx, newPage, errs, pages, ev: (p, c) => p.evaluate(c => (0, eval)(c), c) };
}
module.exports = { boot };
