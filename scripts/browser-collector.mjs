async function createBrowserPage(url) {
  const created = await fetch('http://localhost:3456/new', { method: 'POST', body: url, signal: AbortSignal.timeout(30000) });
  const { targetId } = await created.json();
  if (!targetId) throw new Error('无法创建新闻读取页面');
  return targetId;
}

async function evaluate(targetId, expression, timeout = 15000) {
  const response = await fetch(`http://localhost:3456/eval?target=${targetId}`, { method: 'POST', body: expression, signal: AbortSignal.timeout(timeout) });
  const result = await response.json();
  if (result.error || !response.ok) throw new Error(result.error || '浏览器读取失败');
  return result.value;
}

async function closeBrowserPage(targetId) {
  await fetch(`http://localhost:3456/close?target=${targetId}`, { signal: AbortSignal.timeout(10000) }).catch(() => {});
}

export async function collectBrowserHtml(url) {
  const targetId = await createBrowserPage(url);
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      const value = await evaluate(targetId, 'JSON.stringify({ ready: document.readyState, bodyLength: document.body?.innerText.length || 0 })');
      const state = typeof value === 'string' ? JSON.parse(value) : value;
      if (state.ready !== 'loading' && state.bodyLength) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const html = await evaluate(targetId, 'document.documentElement.outerHTML', 30000);
    if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) throw new Error('浏览器未返回可解析页面');
    return html;
  } finally {
    await closeBrowserPage(targetId);
  }
}

export async function collectBrowserLinks(url, pathPrefix) {
  const targetId = await createBrowserPage(url);
  try {
    const expression = `JSON.stringify(Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(item => item.href.includes(${JSON.stringify(pathPrefix)}) && item.text.length > 10))`;
    for (let attempt = 0; attempt < 16; attempt++) {
      const value = await evaluate(targetId, expression);
      const links = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(links) && links.length) return links;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('等待页面加载后仍未读到新闻列表');
  } finally {
    await closeBrowserPage(targetId);
  }
}
