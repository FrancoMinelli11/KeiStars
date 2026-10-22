/**
 * entorno de pruebas: node (los módulos bajo prueba son puros:
 * tiempo, coordenadas, layouts, temas, zonas horarias y storage).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/state/**"],
      exclude: ["src/lib/celestialTypes.ts", "src/lib/celestialLoader.ts"],
    },
  },
});
