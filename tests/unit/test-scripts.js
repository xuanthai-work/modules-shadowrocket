const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '../..');

function createMockEnv(requestUrl, responseBody, requestHeaders = {}) {
  const result = { body: null, headers: null };
  const env = {
    $request: {
      url: requestUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        ...requestHeaders
      }
    },
    $response: {
      body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
      headers: {}
    },
    $done: (output) => {
      if (output) {
        if (output.body !== undefined) result.body = output.body;
        if (output.headers !== undefined) result.headers = output.headers;
      }
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  return { env, result };
}

test('Locket Gold Script - modifies RevenueCat subscriber response', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/locket/locket.js');
  const fixturePath = path.join(ROOT_DIR, 'tests/fixtures/locket-response.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const { env, result } = createMockEnv(
    'https://api.revenuecat.com/v1/subscribers/test_user_001',
    fixture,
    { 'User-Agent': 'Locket/1.0 (iPhone; iOS 17.0)' }
  );

  const context = vm.createContext(env);
  vm.runInContext(scriptCode, context);

  assert.ok(result.body, 'Expected $done to be called with modified body');
  const modified = JSON.parse(result.body);
  assert.ok(modified.subscriber, 'Modified payload must contain subscriber');
  assert.ok(
    modified.subscriber.entitlements && modified.subscriber.entitlements.Gold,
    'Expected Gold entitlement to be present'
  );
});

test('Locket DeleteHeader Script - strips caching headers', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/locket/deleteHeader.js');
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const headers = {
    'X-RevenueCat-ETag': 'etag123',
    'If-None-Match': 'match123',
    'Cache-Control': 'max-age=3600',
    'User-Agent': 'Locket/1.0'
  };

  const { env, result } = createMockEnv('https://api.revenuecat.com/v1/subscribers', {}, headers);
  const context = vm.createContext(env);
  vm.runInContext(scriptCode, context);

  assert.ok(result.headers, 'Expected $done to be called with modified headers');
  assert.strictEqual(result.headers['X-RevenueCat-ETag'], '');
  assert.strictEqual(result.headers['If-None-Match'], '');
  assert.strictEqual(result.headers['Cache-Control'], 'no-cache');
});

test('SoundCloud Script - sets plan to go-plus and unlocks features', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/soundcloud/soundcloud.js');
  const fixturePath = path.join(ROOT_DIR, 'tests/fixtures/soundcloud-config.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const { env, result } = createMockEnv('https://api-mobile.soundcloud.com/configuration/ios', fixture);
  const context = vm.createContext(env);
  vm.runInContext(scriptCode, context);

  assert.ok(result.body, 'Expected $done to be called with modified body');
  const modified = JSON.parse(result.body);
  assert.strictEqual(modified.plan.plan_id, 'go-plus');
  const noAds = modified.features.find(f => f.name === 'no_audio_ads');
  assert.ok(noAds && noAds.enabled === true, 'Audio ads should be disabled');
});

test('Duolingo Super Script - user profile endpoint', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/duolingo/super.js');
  const fixturePath = path.join(ROOT_DIR, 'tests/fixtures/duolingo-users-response.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const { env, result } = createMockEnv('https://ios-api-2.duolingo.com/2017-06-30/users/12345', fixture);
  const context = vm.createContext(env);
  vm.runInContext(scriptCode, context);

  assert.ok(result.body, 'Expected $done to be called with modified body');
  const modified = JSON.parse(result.body);
  assert.ok(modified.subscription && modified.subscription.tier === 'Super');
  assert.strictEqual(modified.user.isSuper, true);
});

test('Duolingo Super Script - subscribers endpoint (regression check for const reassignment fix)', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/duolingo/super.js');
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const { env, result } = createMockEnv('https://ios-api-2.duolingo.com/subscribers/12345', {});
  const context = vm.createContext(env);

  assert.doesNotThrow(
    () => vm.runInContext(scriptCode, context),
    'Script must not throw TypeError on subscribers path after let body fix'
  );
  assert.ok(result.body, 'Expected $done with modified subscriber payload');
  const modified = JSON.parse(result.body);
  assert.ok(modified.subscriber && modified.subscriber.entitlements && modified.subscriber.entitlements.Super);
});

test('Spotify Script - static syntax loading check only', () => {
  const spScript = path.join(ROOT_DIR, 'scripts/spotify/spotify.js');
  assert.ok(fs.existsSync(spScript), 'Spotify script exists');
  const spCode = fs.readFileSync(spScript, 'utf-8');
  assert.doesNotThrow(() => new Function(spCode), 'Spotify script has valid JS syntax');
  console.log('    [Note] Protobuf scripts: Static validation passed; runtime compatibility not verified.');
});

// --- YouTube (duyvinh09/Module_IOS, pinned external script) -------------------

// Parse a Shadowrocket [Script] section into { name -> { rawParams, get(key) } }.
function parseScriptSection(moduleText) {
  const lines = moduleText.split(/\r?\n/);
  const handlers = {};
  let inScript = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('[')) { inScript = line.toLowerCase() === '[script]'; continue; }
    if (!inScript || !line || line.startsWith('#') || line.startsWith('//')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const name = line.slice(0, eq).trim();
    const rest = line.slice(eq + 1);
    handlers[name] = {
      raw: rest,
      get(key) {
        const m = rest.match(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^,\\s]+)'));
        return m ? m[1] : null;
      }
    };
  }
  return handlers;
}

const YT_MODULE = path.join(ROOT_DIR, 'modules/experimental/youtube.module');
const YT_PINNED_SCRIPT = 'https://raw.githubusercontent.com/duyvinh09/Module_IOS/34865755c1aee7ba770c1afa364254d8924cfd85/js/youtube.response.js';
const YT_RESPONSE_ENDPOINTS = [
  'browse', 'next', 'player', 'search', 'reel/reel_watch_sequence',
  'guide', 'account/get_setting', 'get_watch'
];
const YT_REQUEST_ENDPOINTS = [
  'browse', 'next', 'player', 'reel/reel_watch_sequence', 'get_watch'
];

// Extract non-comment rule lines from a named section (e.g. '[URL Rewrite]').
function parseSectionLines(moduleText, sectionName) {
  const lines = moduleText.split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('[')) { inSection = line.toLowerCase() === sectionName.toLowerCase(); continue; }
    if (!inSection || !line || line.startsWith('#') || line.startsWith('//')) continue;
    out.push(line);
  }
  return out;
}

test('YouTube Module - declares youtube.request and youtube.response', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  assert.ok(handlers['youtube.request'], 'Handler "youtube.request" must be present');
  assert.ok(handlers['youtube.response'], 'Handler "youtube.response" must be present');
  assert.ok(!handlers['youtube.request.init'], 'Maasea youtube.request.init must not remain');
  assert.ok(!handlers['youtube.request.log_event'], 'Maasea youtube.request.log_event must not remain');
  assert.strictEqual(handlers['youtube.request'].get('script-path'), YT_PINNED_SCRIPT);
  assert.strictEqual(handlers['youtube.response'].get('script-path'), YT_PINNED_SCRIPT);
});

test('YouTube Module - no template placeholders, no engine=, no Maasea paths', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  assert.ok(!text.includes('{{{'), 'Module must not contain unrendered {{{...}}} placeholders');
  assert.ok(!/\bengine=/.test(text), 'Shadowrocket module must not declare an engine= parameter');
  assert.ok(!/scripts\/youtube\//.test(text), 'Module must not reference removed local Maasea scripts');
  assert.ok(!/Maasea\/sgmodule/.test(text), 'Module must not reference the Maasea script repo');
});

test('YouTube Module - pinned script has valid JS syntax', async () => {
  const res = await fetch(YT_PINNED_SCRIPT);
  assert.strictEqual(res.status, 200, 'Pinned DuyVinh script must be reachable');
  const code = await res.text();
  assert.ok(code.includes('Build:'), 'Pinned script must look like the YouTube response bundle');
  assert.doesNotThrow(() => new Function(code), 'Pinned YouTube script has valid JS syntax');
});

test('YouTube Module - response and request patterns compile and cover DuyVinh endpoints', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  const responseRe = new RegExp(handlers['youtube.response'].get('pattern'));
  const requestRe = new RegExp(handlers['youtube.request'].get('pattern'));
  for (const ep of YT_RESPONSE_ENDPOINTS) {
    assert.ok(responseRe.test(`https://youtubei.googleapis.com/youtubei/v1/${ep}`), `response must match ${ep}`);
  }
  for (const ep of YT_REQUEST_ENDPOINTS) {
    assert.ok(requestRe.test(`https://youtubei.googleapis.com/youtubei/v1/${ep}`), `request must match ${ep}`);
  }
  assert.ok(!requestRe.test('https://youtubei.googleapis.com/youtubei/v1/search'), 'request pattern must not add search');
  assert.ok(!responseRe.test('https://youtubei.googleapis.com/youtubei/v1/log_event'), 'response pattern must not add log_event');
});

test('YouTube Module - all [URL Rewrite] regexes compile', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const rules = parseSectionLines(text, '[URL Rewrite]');
  assert.ok(rules.length >= 5, `Expected the video-ad URL Rewrite rules, got ${rules.length}`);
  const ruleText = rules.join('\n');
  for (const rule of rules) {
    const pattern = rule.split(/\s+/)[0];
    assert.doesNotThrow(() => new RegExp(pattern), `URL Rewrite regex must compile: ${pattern}`);
  }
  // In rule patterns, the videoplayback exclusion must be escaped (videoplayback\?), never raw.
  assert.ok(/videoplayback\\\?/.test(ruleText), 'videoplayback must be escaped as videoplayback\\? in rules');
  assert.ok(!/videoplayback\?/.test(ruleText), 'rule patterns must not contain an unescaped videoplayback?');
});

test('YouTube Module - initplayback Map Local equivalent is a reject-200 rewrite', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const rules = parseSectionLines(text, '[URL Rewrite]');
  const init = rules.find(r => r.includes('initplayback') && r.includes('&oad'));
  assert.ok(init, 'initplayback&oad rewrite must exist');
  assert.ok(/reject-200\s*$/.test(init), 'initplayback&oad must be reject-200 (Map Local empty 200)');
  assert.doesNotThrow(() => new RegExp(init.split(/\s+/)[0]));
});

test('YouTube Module - MITM includes required hostnames', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const mitm = text.split(/\r?\n/).find(l => l.toLowerCase().startsWith('hostname'));
  assert.ok(mitm, 'MITM hostname line must exist');
  for (const host of ['*.googlevideo.com', 'youtubei.googleapis.com', 'www.youtube.com', 's.youtube.com', '-redirector*.googlevideo.com']) {
    assert.ok(mitm.includes(host), `MITM must include ${host}`);
  }
});

test('YouTube dist - standalone and all-in-one use the pinned DuyVinh script', () => {
  const distYt = fs.readFileSync(path.join(ROOT_DIR, 'dist/modules/youtube.module'), 'utf-8');
  const allInOne = fs.readFileSync(path.join(ROOT_DIR, 'dist/all-in-one.module'), 'utf-8');
  for (const text of [distYt, allInOne]) {
    const handlers = parseScriptSection(text);
    assert.strictEqual(handlers['youtube.request'].get('script-path'), YT_PINNED_SCRIPT);
    assert.strictEqual(handlers['youtube.response'].get('script-path'), YT_PINNED_SCRIPT);
    assert.ok(!/scripts\/youtube\//.test(text), 'dist must not reference removed local YouTube scripts');
    assert.ok(!text.includes('{{{'), 'dist must not contain {{{...}}} placeholders');
  }
});

test('Bilibili Script - syntax check (MagicJS runtime skipped)', (t) => {
  const biliScript = path.join(ROOT_DIR, 'scripts/bilibili/bilibili_json.js');
  assert.ok(fs.existsSync(biliScript), 'Bilibili script exists');
  const biliCode = fs.readFileSync(biliScript, 'utf-8');
  assert.doesNotThrow(() => new Function(biliCode), 'Bilibili script has valid JS syntax');
});
