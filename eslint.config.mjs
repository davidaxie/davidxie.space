import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent scratch space. `.claude/worktrees/*` holds full git worktrees —
    // complete copies of this repo pinned to older commits — so linting them
    // re-reports every issue that has since been fixed on the real tree, from
    // paths that also dodge the canvas rule scoping below. Left unignored it
    // reported 31 errors / 19 warnings while `eslint src/` was completely clean.
    ".claude/**",
  ]),
  {
    // React Compiler's hook rules assume a pure, immutable render model. The
    // react-three-fiber render loop is the opposite by design: `useFrame` runs
    // outside React's reconciler and drives the scene by mutating live GPU
    // objects in place —
    //
    //   uniforms.uTime.value = t     // shader uniform, must mutate
    //   camera.position.x += dx      // camera rig, must mutate
    //
    // Reallocating those objects per frame would drop the references Three.js
    // holds and tank the frame rate, so the mutation is the correct pattern
    // here. These two rules are therefore off for the canvas layer only.
    // Everything else — purity, exhaustive-deps, set-state-in-effect — stays
    // on, and all rules remain fully active for non-canvas code.
    files: ["src/components/canvas/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
