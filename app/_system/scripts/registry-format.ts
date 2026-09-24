import { readFileSync, writeFileSync } from "node:fs";
import { canonicalJson } from "./lib/canonical-json";
for (const f of ["registry/registry.json", "registry/locales/pt-BR.json"]) {
  writeFileSync(f, canonicalJson(JSON.parse(readFileSync(f, "utf8"))));
  console.log("formatted", f);
}
