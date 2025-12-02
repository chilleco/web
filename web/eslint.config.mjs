import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    // Disable overly strict React 19 rules until the codebase is updated to follow them.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;
