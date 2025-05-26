      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              // Light theme – Material 3
              light: {
                primary: "#6750A4",
                "primary-container": "#EADDFF",
                "on-primary-container": "#21005D",
                secondary: "#625B71",
                "secondary-container": "#E8DEF8",
                "on-secondary-container": "#1D192B",
                tertiary: "#7D5260",
                "tertiary-container": "#FFD8E4",
                "on-tertiary-container": "#31111D",
                error: "#B3261E",
                "error-container": "#F9DEDC",
                "on-error-container": "#410E0B",
                background: "#FFFBFE",
                "on-background": "#1C1B1F",
                surface: "#FFFBFE",
                "on-surface": "#1C1B1F",
                "surface-variant": "#E7E0EC",
                "on-surface-variant": "#49454F",
                outline: "#79747E",
              },
              // Dark theme – Material 3
              dark: {
                primary: "#D0BCFF",
                "primary-container": "#4F378B",
                "on-primary-container": "#EADDFF",
                secondary: "#CCC2DC",
                "secondary-container": "#4A4458",
                "on-secondary-container": "#E8DEF8",
                tertiary: "#EFB8C8",
                "tertiary-container": "#633B48",
                "on-tertiary-container": "#FFD8E4",
                error: "#F2B8B5",
                "error-container": "#8C1D18",
                "on-error-container": "#F9DEDC",
                background: "#1C1B1F",
                "on-background": "#E6E1E5",
                surface: "#1C1B1F",
                "on-surface": "#E6E1E5",
                "surface-variant": "#49454F",
                "on-surface-variant": "#CAC4D0",
                outline: "#938F99",
              },
            },
            fontFamily: {
              sans: ["Roboto", "sans-serif"],
            },
            boxShadow: {
              "m3-light":
                "0 1px 2px 0 rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              "m3-dark":
                "0 1px 2px 0 rgba(0, 0, 0, 0.25), 0 1px 3px 0 rgba(0, 0, 0, 0.25)", // Darker, more subtle
            },
          },
        },
      };
