/**
 * Minimal Chrome DevTools Protocol driver for ReadmePDF verification.
 * Connects to an already-running headless Chrome (--remote-debugging-port).
 */
export async function connectCdp({ port = 9333 } = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page' && t.url.startsWith('http://127.0.0.1:4322'));
  if (!target) throw new Error('ReadmePDF page target not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else entry.resolve(msg.result);
      return;
    }
    for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
  });

  function send(method, params = {}) {
    const messageId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });
  }

  function on(method, fn) {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  }

  const consoleErrors = [];
  const exceptions = [];
  const failedRequests = [];
  on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') consoleErrors.push(`${entry.source}: ${entry.text}`);
  });
  on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    exceptions.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  });
  on('Network.loadingFailed', (params) => {
    if (params.errorText && params.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push(`${params.errorText} ${params.type ?? ''}`.trim());
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Network.enable');

  async function evaluate(expression, { awaitPromise = true, userGesture = false } = {}) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text ??
          'Evaluation failed',
      );
    }
    return result.result?.value;
  }

  async function waitFor(expression, { timeout = 30000, interval = 100 } = {}) {
    const started = Date.now();
    let last;
    while (Date.now() - started < timeout) {
      last = await evaluate(expression);
      if (last) return last;
      await sleep(interval);
    }
    throw new Error(`Timed out waiting for: ${expression} (last=${JSON.stringify(last)})`);
  }

  async function screenshot(path) {
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, Buffer.from(data, 'base64'));
  }

  async function printPdf(path, params = {}) {
    const { data } = await send('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
      ...params,
    });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, Buffer.from(data, 'base64'));
    return Buffer.from(data, 'base64').length;
  }

  async function setViewport(width, height, { mobile = false } = {}) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
  }

  async function key(key, { code, windowsVirtualKeyCode } = {}) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: code ?? key,
      windowsVirtualKeyCode: windowsVirtualKeyCode ?? 0,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: code ?? key,
      windowsVirtualKeyCode: windowsVirtualKeyCode ?? 0,
    });
  }

  function close() {
    ws.close();
  }

  return {
    send,
    on,
    evaluate,
    waitFor,
    screenshot,
    printPdf,
    setViewport,
    key,
    close,
    consoleErrors,
    exceptions,
    failedRequests,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function click(page, selector) {
  return page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing element: ' + ${JSON.stringify(selector)});
    el.click();
    return true;
  })()`);
}

export async function setValue(page, selector, value) {
  return page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing element: ' + ${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

export async function text(page, selector) {
  return page.evaluate(
    `document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`,
  );
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
