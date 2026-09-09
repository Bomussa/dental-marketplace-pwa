import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/csv";

describe("csvCell", () => {
  it("returns plain cells unchanged", () => {
    expect(csvCell("clinic")).toBe("clinic");
    expect(csvCell(125)).toBe("125");
  });

  it("quotes cells containing CSV delimiters or line breaks", () => {
    expect(csvCell("clinic, north")).toBe('"clinic, north"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell('quoted "name"')).toBe('"quoted ""name"""');
  });
});
