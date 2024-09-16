import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../../src/index.js";
import { save } from "../common.js";

describe("bug-198", () => {
  it("should draw lines", async () => {
    const img = pureimage.make(128, 128);
    const ctx = img.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 128, 128);
    ctx.lineWidth = 4; // works with 1
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const line = [
      [90.0, 91],
      [92.25, 91],
      [92.25, 90],
      [90.0, 90],
      //[92.00, 90] // works without this
    ];
    console.log("moving");
    ctx.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) {
      ctx.lineTo(line[i][0], line[i][1]);
    }
    console.log("stroking");
    ctx.stroke();
    console.log("done");
    await save(img, "bug/198");
  });
});
