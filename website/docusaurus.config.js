// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "m2c2-assessments",
  tagline: "URL parameter reference for the m2c2kit cognitive assessments",
  url: "https://andreifoldes.github.io",
  // Served from the docs/ folder of the main branch via GitHub Pages
  baseUrl: "/m2c2-assessments/docs/",
  onBrokenLinks: "throw",

  markdown: {
    // Generated pages are plain CommonMark (.md); parameter descriptions may
    // contain { } < > that MDX would try to parse as JSX.
    format: "detect",
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.js",
          editUrl: undefined,
        },
        blog: false,
        pages: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "m2c2-assessments",
        items: [
          {
            href: "https://andreifoldes.github.io/m2c2-assessments/",
            label: "Launch page",
            position: "right",
          },
          {
            href: "https://github.com/andreifoldes/m2c2-assessments",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        copyright: `Generated from task source code — do not edit pages by hand. Built with Docusaurus.`,
      },
      colorMode: {
        respectPrefersColorScheme: true,
      },
    }),
};

export default config;
