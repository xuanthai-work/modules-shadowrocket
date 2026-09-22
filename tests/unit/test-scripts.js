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

// --- YouTube (Maasea, vendored) static checks ---------------------------------

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
const REQUIRED_YT_ENDPOINTS = [
  'browse', 'next', 'player', 'search', 'reel/reel_watch_sequence',
  'guide', 'account/get_setting', 'get_watch', 'log_event', 'config'
];

test('YouTube Module - parses and declares all three handlers', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  for (const h of ['youtube.response', 'youtube.request.init', 'youtube.request.log_event']) {
    assert.ok(handlers[h], `Handler "${h}" must be present`);
  }
});

test('YouTube Module - no template placeholders and no engine=script', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  assert.ok(!text.includes('{{{'), 'Module must not contain unrendered {{{...}}} placeholders in dist source');
  assert.ok(!/engine=script/.test(text), 'Module must not declare engine=script');
});

test('YouTube Module - script-path files exist and have valid JS syntax', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  const seen = new Set();
  for (const name of Object.keys(handlers)) {
    const sp = handlers[name].get('script-path');
    assert.ok(sp, `Handler "${name}" must declare a script-path`);
    assert.ok(sp.startsWith('scripts/youtube/'), `Handler "${name}" must reference a vendored local script, got ${sp}`);
    if (seen.has(sp)) continue;
    seen.add(sp);
    const abs = path.join(ROOT_DIR, sp);
    assert.ok(fs.existsSync(abs), `Local script must exist: ${sp}`);
    const code = fs.readFileSync(abs, 'utf-8');
    assert.doesNotThrow(() => new Function(code), `Valid JS syntax: ${sp}`);
  }
});

test('YouTube Module - response pattern compiles and covers required endpoints', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  const pattern = handlers['youtube.response'].get('pattern');
  assert.ok(pattern, 'youtube.response must have a pattern');
  let re;
  assert.doesNotThrow(() => { re = new RegExp(pattern); }, 'Response pattern regex must compile');
  for (const ep of REQUIRED_YT_ENDPOINTS) {
    const url = `https://youtubei.googleapis.com/youtubei/v1/${ep}`;
    assert.ok(re.test(url), `Response pattern must match endpoint: ${ep}`);
  }
});

test('YouTube Module - request patterns compile (initplayback + log_event)', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const handlers = parseScriptSection(text);
  const initPat = handlers['youtube.request.init'].get('pattern');
  const logPat = handlers['youtube.request.log_event'].get('pattern');
  let initRe, logRe;
  assert.doesNotThrow(() => { initRe = new RegExp(initPat); }, 'init pattern must compile');
  assert.doesNotThrow(() => { logRe = new RegExp(logPat); }, 'log_event pattern must compile');
  assert.ok(initRe.test('https://rr1---sn-abc.googlevideo.com/initplayback?foo=1&ack=1'), 'init pattern must match initplayback+ack');
  assert.ok(logRe.test('https://youtubei.googleapis.com/youtubei/v1/log_event'), 'log_event pattern must match');
});

test('YouTube Module - MITM includes required hostnames', () => {
  const text = fs.readFileSync(YT_MODULE, 'utf-8');
  const mitm = text.split(/\r?\n/).find(l => l.toLowerCase().startsWith('hostname'));
  assert.ok(mitm, 'MITM hostname line must exist');
  assert.ok(mitm.includes('*.googlevideo.com'), 'MITM must include *.googlevideo.com');
  assert.ok(mitm.includes('youtubei.googleapis.com'), 'MITM must include youtubei.googleapis.com');
});

test('YouTube dist - build rewrote local paths to absolute raw URLs', () => {
  const distYt = path.join(ROOT_DIR, 'dist/modules/youtube.module');
  assert.ok(fs.existsSync(distYt), 'dist/modules/youtube.module must exist (run the build)');
  const text = fs.readFileSync(distYt, 'utf-8');
  const handlers = parseScriptSection(text);
  for (const h of ['youtube.response', 'youtube.request.init', 'youtube.request.log_event']) {
    assert.ok(handlers[h], `dist must contain handler "${h}"`);
    const sp = handlers[h].get('script-path');
    assert.ok(/^https:\/\/raw\.githubusercontent\.com\/.+\/scripts\/youtube\//.test(sp),
      `dist handler "${h}" must use an absolute raw URL, got ${sp}`);
  }
  assert.ok(!/script-path=scripts\//.test(text), 'dist must not contain unresolved relative script paths');
});

test('Bilibili Script - syntax check (MagicJS runtime skipped)', (t) => {
  const biliScript = path.join(ROOT_DIR, 'scripts/bilibili/bilibili_json.js');
  assert.ok(fs.existsSync(biliScript), 'Bilibili script exists');
  const biliCode = fs.readFileSync(biliScript, 'utf-8');
  assert.doesNotThrow(() => new Function(biliCode), 'Bilibili script has valid JS syntax');
});
