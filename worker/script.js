/**
 * Cloudflare Worker - R2 静态站点路由
 * 将 /path 映射到 /path/index.html
 * 未知路径返回 404
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let key = url.pathname.slice(1); // 去掉前导 /

    // 如果是根路径，返回 index.html
    if (!key) {
      key = 'index.html';
    }

    // 检查对象是否存在
    try {
      const object = await env.ASSETS.get(key);
      if (object) {
        return new Response(object.body, {
          headers: {
            'Content-Type': getContentType(key),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // 尝试添加 .html 后缀
      const htmlKey = key.endsWith('.html') ? key : `${key}.html`;
      const htmlObject = await env.ASSETS.get(htmlKey);
      if (htmlObject) {
        return new Response(htmlObject.body, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // 尝试 /path/index.html 格式
      const indexKey = key.endsWith('/') ? `${key}index.html` : `${key}/index.html`;
      const indexObject = await env.ASSETS.get(indexKey);
      if (indexObject) {
        return new Response(indexObject.body, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // 返回 404
      const notFound = await env.ASSETS.get('404.html');
      if (notFound) {
        return new Response(notFound.body, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
  };
  return types[ext] || 'application/octet-stream';
}
