import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../developer.html', import.meta.url), 'utf8');

test('developer page states public and collaborator self-host boundaries', () => {
  assert.match(html, /公开可运行/);
  assert.match(html, /需要后端仓库权限/);
  assert.match(html, /尚未公开发行/);
  assert.match(html, /完整后端仓库尚未作为公开发行包提供/);
});

test('developer page documents local OneBot without embedding credentials', () => {
  assert.match(html, /bot\.live_onebot/);
  assert.match(html, /ws:\/\/127\.0\.0\.1:3001/);
  assert.match(html, /OURNOTES_OWNER_QQ_IDS/);
  assert.doesNotMatch(html, /type=["'](?:password|email)["']/);
  assert.doesNotMatch(html, /314781643|MOENOTES_CLIENT_SECRET\s*=\s*(?!replace)/);
});

test('player page links to developer guide', () => {
  const player = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(player, /href=["']\.\/developer\.html["']/);
});

test('brand mark uses the approved motifs without a waterdrop or shizuku glyph', () => {
  const logo = readFileSync(new URL('../public/shizukubot-logo.svg', import.meta.url), 'utf8');
  assert.match(logo, /id="plaid"/);
  assert.match(logo, /id="heart"/);
  assert.match(logo, /id="lavender"/);
  assert.match(logo, /id="gold"/);
  assert.doesNotMatch(logo, /waterdrop|雫/i);
});
