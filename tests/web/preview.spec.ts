import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();

async function capturePage(page: Page, name: string) {
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
  await expect
    .poll(() =>
      page
        .locator("#content img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.evaluate(async () => {
    const animations = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect?.getComputedTiming().iterations !== Infinity,
      );
    await Promise.all(
      animations.map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.screenshot({ path: test.info().outputPath(name) });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('[data-act="login"]').first().click();
  await expect(page.locator("#nav")).toHaveText("智场通");
  await page.evaluate(() => document.fonts.ready);
  // Report asynchronous errors as part of each interaction check.
  pageErrors.set(page, errors);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test("search, clear and type filters keep the list usable", async ({
  page,
}) => {
  await page.locator('#tabbar [data-page="场地"]').click();
  const cards = page.locator("#venue-results .venue-card");
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  await page.locator("#listSearch").fill("不存在的场馆");
  await expect(cards).toHaveCount(0);
  await expect(page.locator("#venue-results")).toContainText("暂无匹配场地");
  await page.locator('[data-act="clear-search"]').click();
  await expect(cards).toHaveCount(count);
  await page.locator('[data-act="filter-type"][data-type="篮球"]').click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("篮球");
  await capturePage(page, "venues.png");
  await page.locator('[data-act="filter-type"][data-type="全部"]').click();
  await expect(cards).toHaveCount(count);
  expect(
    await page.locator("[onclick], [oninput], [onfocus], [onblur]").count(),
  ).toBe(0);
});

test("future booking preserves date and selected order details", async ({
  page,
}) => {
  await page.locator('[data-act="start-booking"]').first().click();
  const dateButton = page
    .locator('[data-act="select-date"][data-disabled="0"]:not(.today)')
    .first();
  await expect(dateButton).toBeVisible();
  const date = await dateButton.getAttribute("data-date");
  await dateButton.click();
  await page.locator('[data-act="go"][data-page="选择时间"]').click();
  await page
    .locator('[data-act="select-slot"][data-disabled="0"]')
    .first()
    .click();
  await page.locator('[data-act="go"][data-page="选场地"]').click();
  await page
    .locator('[data-act="select-court"][data-disabled="0"]')
    .first()
    .click();
  await page.locator('[data-act="go"][data-page="填写信息"]').click();
  await page.locator("#f-sid").fill("20260001");
  await page.locator("#f-name").fill("测试同学");
  await page.locator("#f-phone").fill("13800138000");
  await page.locator('[data-act="submit-booking"]').click();
  await expect(page.locator("#nav")).toContainText("预约成功");
  await expect(page.locator(".ticket")).toContainText(date!);
  await capturePage(page, "booking-success.png");
  await page.locator('[data-page="订单"][data-clear-order]').click();
  const codeButton = page.locator('[data-act="show-code"]').first();
  const id = await codeButton.getAttribute("data-id");
  await codeButton.click();
  await expect(page.locator(".ticket")).toContainText(id!.slice(-8));
  await expect(page.locator(".ticket")).toContainText(date!);
});

test("navigation cancels pending filter rendering and logout works", async ({
  page,
}) => {
  await page.locator('#tabbar [data-page="场地"]').click();
  await page.locator('[data-act="filter-type"][data-type="篮球"]').click();
  await page.locator('#tabbar [data-page="我的"]').click();
  await page.waitForTimeout(900);
  await expect(page.locator("#nav")).toHaveText("我的");
  await page.locator('[data-act="logout"]').click();
  await expect(page.locator("#nav")).toHaveText("登录");
  await expect(page.locator("#tabbar button")).toHaveCount(0);
});

test("shared preview entry and responsive shell", async ({ page }) => {
  await capturePage(page, "home.png");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.goto("/preview.html");
  await expect(page.locator('[data-act="login"]').first()).toBeVisible();
  await page.locator('[data-act="login"]').first().click();
  await expect(page.locator("#nav")).toHaveText("智场通");
});

test("separate motion entry binds its controls", async ({ page }) => {
  await page.goto("/animation-preview.html");
  await page.locator("#chips .chip").nth(1).click();
  await expect(page.locator("#chips .active")).toHaveCount(1);
  await expect(page.locator("#chips .active")).toContainText("篮球");
  await page.locator("#openSheet").click();
  await expect(page.locator("#sheet")).toHaveClass(/show/);
  await page.locator("#closeSheet").click();
  await expect(page.locator("#sheet")).not.toHaveClass(/show/);
});
