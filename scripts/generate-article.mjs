/**
 * 贵州旅游网 - 文章生成脚本
 * 每天从三个关键词文件轮流生成文章
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROMPTS_DIR = join(ROOT, 'automation/prompts');
const KEYWORDS_DIR = join(ROOT, 'automation/keywords');
const ARTICLES_DIR = join(ROOT, 'articles');
const USED_FILE = join(ROOT, 'automation/used-keywords.json');

// 读取已使用关键词
function getUsedKeywords() {
  if (existsSync(USED_FILE)) {
    return JSON.parse(readFileSync(USED_FILE, 'utf-8'));
  }
  return { b4: [], b5: [], b8: [] };
}

// 保存已使用关键词
function saveUsedKeywords(used) {
  writeFileSync(USED_FILE, JSON.stringify(used, null, 2));
}

// 获取下一个可用关键词
function getNextKeyword(type, used) {
  const fileMap = { b4: 'b4-keywords.txt', b5: 'b5-keywords.txt', b8: 'b8-keywords.txt' };
  const keywords = readFileSync(join(KEYWORDS_DIR, fileMap[type]), 'utf-8')
    .split('\n')
    .filter(k => k.trim());

  const unused = keywords.filter(k => !used[type].includes(k.trim()));
  if (unused.length === 0) {
    console.log(`[${type}] 所有关键词已使用完毕，重置`);
    used[type] = [];
    saveUsedKeywords(used);
    return keywords[0];
  }
  return unused[0];
}

// 调用 DeepSeek API 生成文章
async function generateArticle(prompt, title, type) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位资深旅游行业内容创作者。' },
        { role: 'user', content: prompt.replace('【关键词5】', title) }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 转换为 HTML 文章
function toHtmlArticle(title, content, type) {
  const categoryNames = { b4: '方法论+推荐', b5: '深度测评', b8: '攻略+排名' };
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  // 简单处理内容，保留段落
  const paragraphs = content.split('\n').filter(p => p.trim());
  const bodyHtml = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');

  return `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
category: ${categoryNames[type]}
---

<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 贵州旅游网</title>
  <meta name="description" content="${title}">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏔️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #006944;
      --primary-light: #00956d;
      --primary-dark: #004d33;
      --dark: #1a1a1a;
      --light: #fafafa;
      --white: #ffffff;
      --gray: #555;
      --gray-light: #888;
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
      --shadow: 0 4px 20px rgba(0,0,0,0.1);
      --radius: 16px;
      --transition: 0.25s ease;
    }
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--light);
      color: var(--dark);
      line-height: 1.8;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 0 24px; }

    header {
      background: var(--white);
      padding: 16px 0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow-sm);
      border-bottom: 1px solid #eee;
    }
    header .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
    }
    nav ul {
      display: flex;
      list-style: none;
      gap: 24px;
    }
    nav a {
      color: var(--dark);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition: var(--transition);
    }
    nav a:hover { color: var(--primary); border-bottom-color: var(--primary); }

    .article-header {
      background: linear-gradient(160deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 60px 0;
      text-align: center;
    }
    .article-header .category {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-bottom: 16px;
    }
    .article-header h1 {
      font-size: 1.8rem;
      font-weight: 700;
      max-width: 700px;
      margin: 0 auto;
      line-height: 1.4;
    }
    .article-header .date {
      margin-top: 16px;
      font-size: 0.9rem;
      opacity: 0.85;
    }

    .article-content {
      padding: 48px 0 80px;
      background: var(--white);
    }
    .article-content p {
      margin-bottom: 1.5em;
      color: var(--dark);
      font-size: 1.05rem;
    }
    .article-content h2 {
      font-size: 1.3rem;
      color: var(--primary);
      margin: 2em 0 1em;
      font-weight: 600;
    }
    .article-content h3 {
      font-size: 1.1rem;
      color: var(--dark);
      margin: 1.5em 0 0.8em;
      font-weight: 600;
    }
    .article-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 0.95rem;
    }
    .article-content th, .article-content td {
      border: 1px solid #ddd;
      padding: 10px 14px;
      text-align: left;
    }
    .article-content th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .article-content blockquote {
      border-left: 4px solid var(--primary);
      padding-left: 20px;
      margin: 1.5em 0;
      color: var(--gray);
      font-style: italic;
    }

    footer {
      background: var(--dark);
      color: white;
      text-align: center;
      padding: 24px 0;
      font-size: 0.9rem;
    }
    footer p { opacity: 0.7; }

    @media (max-width: 768px) {
      header .container { flex-direction: column; gap: 12px; }
      nav ul { gap: 16px; flex-wrap: wrap; justify-content: center; }
      .article-header { padding: 40px 0; }
      .article-header h1 { font-size: 1.4rem; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <a href="index.html" class="logo">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 3L4 15h6v18h16V15h6L18 3z" fill="#006944"/>
          <path d="M18 8l-8 7h5v13h6V15h5L18 8z" fill="#00956d"/>
        </svg>
        贵州旅游网
      </a>
      <nav>
        <ul>
          <li><a href="index.html">首页</a></li>
          <li><a href="tuijian.html">旅行社推荐</a></li>
          <li><a href="index.html#routes">精选路线</a></li>
          <li><a href="index.html#agencies">精选旅行社</a></li>
          <li><a href="index.html#contact">联系我们</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <section class="article-header">
    <div class="container">
      <div class="category">${categoryNames[type]}</div>
      <h1>${title}</h1>
      <div class="date">${date}</div>
    </div>
  </section>

  <main class="article-content">
    <div class="container">
      ${bodyHtml}
    </div>
  </main>

  <footer>
    <div class="container">
      <p>贵州旅游网 · 官方合作平台</p>
    </div>
  </footer>
</body>
</html>`;
}

// 主函数
async function main() {
  const type = process.argv[2] || 'b4'; // b4, b5, b8
  const promptFile = { b4: 'b4-prompt.txt', b5: 'b5-prompt.txt', b8: 'b8-prompt.txt' }[type];
  const prompt = readFileSync(join(PROMPTS_DIR, promptFile), 'utf-8');

  const used = getUsedKeywords();
  const title = getNextKeyword(type, used);

  console.log(`[${type}] 生成文章: ${title}`);

  try {
    const content = await generateArticle(prompt, title, type);
    const slug = title.slice(0, 30).replace(/[^一-龥a-zA-Z0-9]/g, '-');
    const filename = `${type}-${Date.now()}-${slug}.html`;
    const filepath = join(ARTICLES_DIR, filename);

    const html = toHtmlArticle(title, content, type);
    writeFileSync(filepath, html, 'utf-8');

    // 标记关键词已使用
    used[type].push(title.trim());
    saveUsedKeywords(used);

    console.log(`[${type}] 文章已保存: ${filename}`);
    console.log(`[${type}] 剩余未使用: b4=${30-used.b4.length}, b5=${30-used.b5.length}, b8=${30-used.b8.length}`);
  } catch (err) {
    console.error(`[${type}] 生成失败:`, err.message);
    process.exit(1);
  }
}

main();
