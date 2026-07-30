const React = require("react");
const { render, screen } = require("@testing-library/react");
const { FoundationShell } = require("../../apps/web/src/foundation-shell.cjs");

test("AC-016 renders the content-free platform shell", () => {
  render(React.createElement(FoundationShell));
  expect(screen.getByRole("heading", { name: "SiroMix" })).toBeVisible();
  expect(screen.getByText("Platform foundation is ready.")).toBeVisible();
});
