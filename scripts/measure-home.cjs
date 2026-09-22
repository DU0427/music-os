// 首页一屏实测：CDP 连接运行中的 Electron，在 1320x900 / 1100x700 两档设备尺寸下
// 测量首页滚动容器 scrollHeight vs clientHeight。全部 fits=true 视为一屏达标。
// 用法：先启动应用（--remote-debugging-port=9223），再 node scripts/measure-home.cjs --port 9223
const http = require('node:http');

function getPageTarget(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const targets = JSON.parse(data).filter((t) => t.url.endsWith('out/renderer/index.html'));
        targets.length ? resolve(targets[0]) : reject(new Error('renderer target not found'));
      });
    }).on('error', reject);
  });
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
      close: () => ws.close(),
    }));
    ws.addEventListener('error', reject);
  });
}

async function main() {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1] ?? 9223);
  const target = await getPageTarget(port);
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // 重载以确保测量的是当前构建（BootSplash 最短 3.2s + 内容载入）
  await cdp.send('Page.reload');
  await new Promise((r) => setTimeout(r, 6000));
  // 确保在 home 且非沉浸态（沉浸态会整块收起内容，测出来的是空页）
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      window.dispatchEvent(new CustomEvent('music-os-set-space', { detail: 'home' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return 'ok';
    })()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 1000));
  const guard = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const sc = document.querySelector('.mo-no-scrollbar.overflow-y-auto');
      const first = sc?.firstElementChild?.firstElementChild;
      return JSON.stringify({ heroHeight: first ? Math.round(first.getBoundingClientRect().height) : -1 });
    })()`,
    returnByValue: true,
  });
  const heroHeight = JSON.parse(guard.result.value).heroHeight;
  if (!(heroHeight > 60)) {
    console.error(`GUARD FAILED: hero collapsed (height=${heroHeight})，测量对象是空页`);
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    cdp.close();
    process.exit(3);
  }
  console.log(`guard ok: hero=${heroHeight}px`);
  const sizes = [
    { label: '1320x900', width: 1320, height: 900 },
    { label: '1100x700', width: 1100, height: 700 },
  ];
  const results = [];
  for (const size of sizes) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, 450));
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const sc = document.querySelector('.mo-no-scrollbar.overflow-y-auto');
        return JSON.stringify({
          scrollHeight: sc ? Math.round(sc.scrollHeight) : -1,
          clientHeight: sc ? Math.round(sc.clientHeight) : -1,
          overflow: sc ? Math.round(sc.scrollHeight - sc.clientHeight) : -1,
        });
      })()`,
      returnByValue: true,
    });
    const m = JSON.parse(r.result.value);
    results.push({ ...size, ...m, fits: m.scrollHeight >= 0 && m.scrollHeight <= m.clientHeight });
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  console.log(JSON.stringify({ sizes: results, allFit: results.every((r) => r.fits) }, null, 2));
  cdp.close();
  process.exit(results.every((r) => r.fits) ? 0 : 2);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
