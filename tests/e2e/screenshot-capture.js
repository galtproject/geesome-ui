const fs = require('fs/promises');
const path = require('path');
const {expect} = require('@playwright/test');

async function captureScreenshot(page, dir, name, options = {}) {
  await fs.mkdir(dir, {recursive: true});

  if (!options.preserveScroll) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0);
  }

  const diagnostics = await page.evaluate(() => {
    const broken = [];
    for (const img of Array.from(document.querySelectorAll('img'))) {
      if (img.naturalWidth === 0) {
        broken.push({src: img.src, alt: img.alt || ''});
        img.style.outline = '3px solid #ff0040';
        img.style.outlineOffset = '-3px';
        img.style.background = 'rgba(255, 0, 64, 0.18)';
      }
    }
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((heading) => heading.textContent.trim())
      .filter(Boolean)
      .slice(0, 10);
    const doc = document.documentElement;
    return {
      broken,
      headings,
      viewport: {width: window.innerWidth, height: window.innerHeight},
      document: {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        scrollY: window.scrollY
      },
      overflowX: doc.scrollWidth > doc.clientWidth
    };
  });

  await page.screenshot({path: path.join(dir, name), fullPage: true});
  await fs.writeFile(
    path.join(dir, name.replace(/\.png$/, '.json')),
    JSON.stringify({
      screenshot: name,
      viewport: diagnostics.viewport,
      headings: diagnostics.headings,
      brokenImages: diagnostics.broken,
      document: diagnostics.document,
      overflowX: diagnostics.overflowX
    }, null, 2) + '\n'
  );
}

async function assertImagesLoaded(page) {
  const broken = await page.locator('img').evaluateAll((imgs) =>
    imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src)
  );
  expect(broken, `Broken images found: ${broken.join(', ')}`).toHaveLength(0);
}

async function assertNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow: scrollWidth ${metrics.scrollWidth} > clientWidth ${metrics.clientWidth}`
  ).toBeLessThanOrEqual(metrics.clientWidth);
}

module.exports = {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
};
