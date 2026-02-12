import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  esbuildOptions(options) {
    options.banner = {
      js: "#!/usr/bin/env node"
    };
  }
});
