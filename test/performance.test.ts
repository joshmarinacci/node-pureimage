import { describe, it } from "vitest";
import * as pureimage from "../src/index.js";

describe("draw rect", () => {
  it("should draw 10 times", () => {
    let image = pureimage.make(800, 600);
    let c = image.getContext("2d");
    c.fillStyle = "green";
    console.time("fill");
    for (let i = 0; i < 10; i++) {
      c.fillRect(0, 0, 800, 600);
    }
    console.timeEnd("fill");
  });
});
