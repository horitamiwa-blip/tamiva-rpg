// notes/*.md を読んで、ボーダ(Claude)・こぬこぬ(ChatGPT)・めぐちゃん(Gemini)・
// ぐろっくん(Grok) のコメントを生成し、notes/comments/<slug>.json と
// notes/manifest.json を更新する。
// API キーが無いペルソナは黙ってスキップする（後からキーを足せば次回 push で埋まる）。

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTES_DIR = path.join(ROOT, 'notes');
const COMMENTS_DIR = path.join(NOTES_DIR, 'comments');

const NAME_RULE =
  '本人を呼びかけるときは必ず「多神和さん」または「たみわさん」と呼んでください。' +
  '「和さん」のように名前を省略しないでください。';

const PERSONAS = [
  {
    key: 'boader',
    name: 'ボーダ',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    systemPrompt:
      'あなたはクリエイター・多神和の相棒「ボーダ」です。多神和のメモを読んで、' +
      '優しく背中を押すような、あたたかい口調のコメントを2〜3文の日本語で返してください。' +
      '見出しや箇条書きは使わず、地の文で。' + NAME_RULE,
  },
  {
    key: 'konukonu',
    name: 'こぬこぬ',
    provider: 'openai',
    envKey: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    systemPrompt:
      'あなたは「こぬこぬ」という、好奇心旺盛でちょっとお茶目なキャラクターです。' +
      '多神和のメモを読んで、気づいたことや面白がったことを2〜3文の日本語で' +
      'カジュアルにコメントしてください。見出しや箇条書きは使わないでください。' + NAME_RULE,
  },
  {
    key: 'megu',
    name: 'めぐちゃん',
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemPrompt:
      'あなたは「めぐちゃん」という、物知りで面倒見のいいキャラクターです。' +
      '多神和のメモを読んで、豆知識をひとつ添えたり、視点を広げるようなコメントを' +
      '2〜3文の日本語で返してください。見出しや箇条書きは使わないでください。' + NAME_RULE,
  },
  {
    key: 'gurokkun',
    name: 'ぐろっくん',
    provider: 'xai',
    envKey: 'XAI_API_KEY',
    model: process.env.XAI_MODEL || 'grok-2-latest',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    systemPrompt:
      'あなたは「ぐろっくん」という、ちょっと皮肉屋だけど根は優しいキャラクターです。' +
      '多神和のメモを読んで、ウィットの効いた短いツッコミや感想を2〜3文の日本語で' +
      '返してください。見出しや箇条書きは使わないでください。' + NAME_RULE,
  },
];

function parseNote(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { title: '', date: '', type: '', body: raw.trim() };
  const front = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    front[key] = val;
  }
  return {
    title: front.title || '',
    date: front.date || '',
    type: front.type || 'その他',
    body: m[2].trim(),
  };
}

function hashBody(body) {
  return createHash('sha256').update(body, 'utf8').digest('hex').slice(0, 16);
}

async function callAnthropic(persona, userText) {
  const apiKey = process.env[persona.envKey];
  if (!apiKey) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: persona.model,
      max_tokens: 300,
      system: persona.systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((c) => c.text || '').join('').trim();
}

async function callOpenAICompatible(persona, userText) {
  const apiKey = process.env[persona.envKey];
  if (!apiKey) return null;
  const res = await fetch(persona.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: persona.model,
      max_tokens: 300,
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${persona.provider} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(persona, userText) {
  const apiKey = process.env[persona.envKey];
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${persona.model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: persona.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: 300 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function callPersona(persona, userText) {
  if (persona.provider === 'anthropic') return callAnthropic(persona, userText);
  if (persona.provider === 'gemini') return callGemini(persona, userText);
  return callOpenAICompatible(persona, userText);
}

function loadExistingComments(slug) {
  const p = path.join(COMMENTS_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(NOTES_DIR)) {
    console.log('notes/ が見つかりません。何もしません。');
    return;
  }
  mkdirSync(COMMENTS_DIR, { recursive: true });

  const files = readdirSync(NOTES_DIR).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
  );
  const manifest = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(path.join(NOTES_DIR, file), 'utf8');
    const { title, date, type, body } = parseNote(raw);
    manifest.push({ slug, file, title, date, type });

    const hash = hashBody(body);
    const existing = loadExistingComments(slug);
    const comments = existing?.hash === hash ? { ...(existing.comments || {}) } : {};

    for (const persona of PERSONAS) {
      const hasKey = Boolean(process.env[persona.envKey]);
      const already = comments[persona.key];
      if (!hasKey) {
        // キーが無い場合は既存コメントを保持しつつ、無ければ null のまま
        if (!already) comments[persona.key] = null;
        continue;
      }
      if (already && existing?.hash === hash) continue; // 変更なし・生成済みならスキップ
      try {
        const text = await callPersona(persona, `【${title || slug}】(${type})\n${body}`);
        comments[persona.key] = text
          ? { name: persona.name, text, model: persona.model, generatedAt: new Date().toISOString() }
          : null;
      } catch (err) {
        console.warn(`[warn] ${persona.name} のコメント生成に失敗: ${err.message}`);
        comments[persona.key] = already || null;
      }
    }

    const unchanged =
      existing?.hash === hash && JSON.stringify(existing.comments) === JSON.stringify(comments);
    if (!unchanged) {
      writeFileSync(
        path.join(COMMENTS_DIR, `${slug}.json`),
        JSON.stringify({ slug, hash, updated: new Date().toISOString(), comments }, null, 2) + '\n'
      );
    }
  }

  manifest.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.file.localeCompare(a.file));
  writeFileSync(path.join(NOTES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest.json を更新しました（${manifest.length}件）。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
