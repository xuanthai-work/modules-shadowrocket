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

test('Duolingo Super Script - known bug verification (const reassignment in /subscribers/ path)', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts/duolingo/super.js');
  const scriptCode = fs.readFileSync(scriptPath, 'utf-8');

  const { env } = createMockEnv('https://ios-api-2.duolingo.com/subscribers/12345', {});
  const context = vm.createContext(env);

  // In super.js, 'const body = JSON.parse($response.body);' followed by 'body = { ... }' throws TypeError: Assignment to constant variable.
  assert.throws(
    () => vm.runInContext(scriptCode, context),
    /Assignment to constant variable/,
    'Expected TypeError on subscribers path due to reassigning const body'
  );
});

test('Protobuf Scripts - static syntax loading check only', () => {
  const ytScript = path.join(ROOT_DIR, 'scripts/youtube/youtube.response.preview.js');
  const spScript = path.join(ROOT_DIR, 'scripts/spotify/spotify.js');

  assert.ok(fs.existsSync(ytScript), 'YouTube script exists');
  assert.ok(fs.existsSync(spScript), 'Spotify script exists');

  // Verify they compile as functions
  const ytCode = fs.readFileSync(ytScript, 'utf-8');
  const spCode = fs.readFileSync(spScript, 'utf-8');
  assert.doesNotThrow(() => new Function(ytCode), 'YouTube script has valid JS syntax');
  assert.doesNotThrow(() => new Function(spCode), 'Spotify script has valid JS syntax');

  console.log('    [Note] Protobuf scripts: Static validation passed; runtime compatibility not verified.');
});

test('Bilibili Script - syntax check (MagicJS runtime skipped)', (t) => {
  const biliScript = path.join(ROOT_DIR, 'scripts/bilibili/bilibili_json.js');
  assert.ok(fs.existsSync(biliScript), 'Bilibili script exists');
  const biliCode = fs.readFileSync(biliScript, 'utf-8');
  assert.doesNotThrow(() => new Function(biliCode), 'Bilibili script has valid JS syntax');
});
