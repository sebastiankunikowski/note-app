      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              // Light Theme (Material You Inspired)
              light: {
                primary: "#3b82f6", // Blue 600
                "primary-container": "#dbeafe", // Blue 100
                "on-primary-container": "#1e40af", // Blue 800
                secondary: "#4f46e5", // Indigo 600
                "secondary-container": "#e0e7ff", // Indigo 100
                "on-secondary-container": "#3730a3", // Indigo 800
                tertiary: "#059669", // Emerald 600
                "tertiary-container": "#a7f3d0", // Emerald 200
                "on-tertiary-container": "#065f46", // Emerald 700
                error: "#dc2626", // Red 600
                "error-container": "#fee2e2", // Red 100
                "on-error-container": "#991b1b", // Red 800
                background: "#f8fafc", // Slate 50
                "on-background": "#0f172a", // Slate 900
                surface: "#ffffff", // White
                "on-surface": "#1e293b", // Slate 800
                "surface-variant": "#e2e8f0", // Slate 200
                "on-surface-variant": "#475569", // Slate 600
                outline: "#cbd5e1", // Slate 300
              },
              // Dark Theme (Material You Inspired)
              dark: {
                primary: "#60a5fa", // Blue 400
                "primary-container": "#1e3a8a", // Blue 800 (adjust for container)
                "on-primary-container": "#bfdbfe", // Blue 200
                secondary: "#818cf8", // Indigo 400
                "secondary-container": "#3730a3", // Indigo 800
                "on-secondary-container": "#c7d2fe", // Indigo 200
                tertiary: "#34d399", // Emerald 400
                "tertiary-container": "#065f46", // Emerald 700
                "on-tertiary-container": "#a7f3d0", // Emerald 200
                error: "#f87171", // Red 400
                "error-container": "#7f1d1d", // Red 900
                "on-error-container": "#fecaca", // Red 200
                background: "#111827", // Gray 900 (cooler dark)
                "on-background": "#f3f4f6", // Gray 100
                surface: "#1f2937", // Gray 800
                "on-surface": "#d1d5db", // Gray 300
                "surface-variant": "#374151", // Gray 700
                "on-surface-variant": "#9ca3af", // Gray 400
                outline: "#4b5563", // Gray 600
              },
            },
            fontFamily: {
              sans: ["Inter", "sans-serif"],
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
