import { describe, it, expect } from "vitest";
import * as PImage from "../../src/index.js";

describe("bug-224: make() with float dimensions should not crash", () => {
    it("should construct without throwing when width and height are floats", () => {
        expect(() => {
            PImage.make(1100.000277777778, 849.9997222222221);
        }).not.toThrow();
    });

    it("constructed bitmap should have integer width and height", () => {
        const image = PImage.make(1100.000277777778, 849.9997222222221);
        expect(image.width).toBe(1100);
        expect(image.height).toBe(849);
    });
});
