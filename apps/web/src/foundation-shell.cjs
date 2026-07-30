const React = require("react");

function FoundationShell() {
  return React.createElement(
    "main",
    null,
    React.createElement("h1", null, "SiroMix"),
    React.createElement("p", null, "Platform foundation is ready."),
  );
}

module.exports = { FoundationShell };
