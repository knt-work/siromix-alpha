import { expect, test } from "@playwright/test";

test("AC-016 minimal web shell is reachable without feature behavior", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SiroMix" })).toBeVisible();
  await expect(page.getByText("Platform foundation is ready.")).toBeVisible();
});
