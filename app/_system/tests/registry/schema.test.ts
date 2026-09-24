import { describe, it, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../registry/registry.schema.json";
import registry from "../../registry/registry.json";

describe("registry.json matches registry.schema.json", () => {
  it("validates", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(registry);
    expect(ok ? [] : validate.errors?.slice(0, 5)).toEqual([]);
  });
});
