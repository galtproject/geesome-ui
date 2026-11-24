const path = require('path');
const {test, expect} = require('@playwright/test');
const {captureScreenshot, assertImagesLoaded, assertNoHorizontalOverflow} = require('./screenshot-capture');
const screenshotDir = path.resolve(__dirname, '../../.agent/tasks/desktop-client/screenshots');
const cid = 'bafybeig4gedjbdzd5ll4omtaklungoqlao7vqtql56muum4fo3s736vzom';
const manifest = {schemaVersion: 1, version: '0.1.4', platform: 'windows-x64', cid, sha256: 'b'.repeat(64), size: 26538540};

async function fixture(page, baseURL, mode = 'available') {
  const publicRequests = [];
  await page.context().addCookies([{name: 'private-session', value: 'do-not-send', url: baseURL}]);
  await page.addInitScript(() => {
    window.copiedInstallerInstructions = ''; window.failClipboard = false;
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: async value => {if (window.failClipboard) {throw new Error('Clipboard unavailable');} window.copiedInstallerInstructions = value;}}});
  });
  const api = `${baseURL}/proxy/api/v1`;
  await page.route('**/.well-known/geesome', async route => {
    publicRequests.push(route.request());
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/.well-known/geesome') { return route.fulfill({status: 404, body: ''}); }
    if (mode === 'error') { return route.fulfill({status: 503, body: ''}); }
    const capability = {schemaVersion: 1, platforms: ['windows-x64'], stableUrl: `${api}/client-releases/stable/windows-x64`, installGuideUrl: `${api}/client-releases/install`};
    if (mode === 'external') { capability.stableUrl = 'https://foreign.example/installer'; }
    await route.fulfill({contentType: 'application/json', body: JSON.stringify({apiBaseUrl: api, gatewayBaseUrl: `${baseURL}/gateway`, capabilities: mode === 'unsupported' ? {} : {clientReleases: capability}})});
  });
  await page.route('**/client-releases/stable/windows-x64', async route => {
    publicRequests.push(route.request());
    await route.fulfill(mode === 'unpublished' ? {status: 404, body: ''} : {contentType: 'application/json', body: JSON.stringify({manifest: Buffer.from(JSON.stringify(mode === 'invalid' ? {...manifest, cid: '../bad'} : manifest)).toString('base64'), signature: Buffer.alloc(64).toString('base64')})});
  });
  await page.goto(`${baseURL}/#desktop-client`);
  return {publicRequests, api};
}

for (const [name, viewport] of [['mobile', {width: 375, height: 667}], ['desktop', {width: 1280, height: 800}]]) {
  test(`native desktop download and agent instructions (${name})`, async ({page, baseURL}) => {
    await page.setViewportSize(viewport);
    const {publicRequests, api} = await fixture(page, baseURL);
    await expect(page.getByTestId('desktop-client-download')).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Windows x64 · Version 0.1.4'})).toBeVisible();
    await expect(page.getByTestId('desktop-client-download')).toHaveAttribute('href', `${baseURL}/gateway/ipfs/${cid}`);
    await expect(page.getByTestId('desktop-client-download')).toHaveAttribute('download', 'GeeSomeClient-0.1.4-windows-x64-Setup.exe');
    await expect(page.getByTestId('desktop-client-guide')).toHaveAttribute('href', `${api}/client-releases/install`);
    await expect(page.getByText(/Installing this website as a Firefox/)).toBeVisible();
    await page.getByTestId('desktop-client-copy').click();
    const copied = await page.evaluate(() => window.copiedInstallerInstructions);
    expect(copied).toContain(api + '/client-releases/install');
    expect(copied).toContain('Do not install the remote website');
    expect(copied).toContain('/api/health'); expect(copied).toContain('Installed Apps');
    expect(publicRequests.length).toBe(3);
    for (const request of publicRequests) { expect(request.headers().authorization).toBeUndefined(); expect(request.headers().cookie).toBeUndefined(); }
    await captureScreenshot(page, screenshotDir, `available-${name}.png`);
    await assertImagesLoaded(page); await assertNoHorizontalOverflow(page);
    await page.evaluate(() => {window.failClipboard = true;});
    await page.getByTestId('desktop-client-copy').click();
    await expect(page.getByTestId('desktop-client-instructions')).toHaveValue(copied);
    await captureScreenshot(page, screenshotDir, `clipboard-fallback-${name}.png`);
    await assertImagesLoaded(page); await assertNoHorizontalOverflow(page);
  });
}
for (const mode of ['unsupported', 'unpublished', 'error', 'external', 'invalid']) {
  test(`no installer substitution when discovery is ${mode}`, async ({page, baseURL}) => {
    await fixture(page, baseURL, mode);
    const state = mode === 'unsupported' ? 'desktop-client-unavailable' : mode === 'unpublished' ? 'desktop-client-unpublished' : 'desktop-client-error';
    await expect(page.getByTestId(state)).toBeVisible();
    await expect(page.getByTestId('desktop-client-download')).toHaveCount(0);
    if (mode === 'unsupported' || mode === 'external' || mode === 'invalid') { await expect(page.getByTestId('desktop-client-copy')).toHaveCount(0); }
    await captureScreenshot(page, screenshotDir, `${mode}-mobile.png`);
    await assertImagesLoaded(page); await assertNoHorizontalOverflow(page);
  });
}
