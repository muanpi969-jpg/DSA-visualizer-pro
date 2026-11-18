import { describe, expect, it } from "vitest";
import { getAllAlgorithms } from "@/lib/algorithms/registry";
describe("requested code languages", () => {
  for (const definition of getAllAlgorithms()) {
    it(`${definition.slug} supplies C, JavaScript, and Python`, () => {
      for (const language of ["c", "javascript", "python"] as const) {
        expect(definition.code[language]?.trim().length).toBeGreaterThan(30);
      }
    });
  }
});
