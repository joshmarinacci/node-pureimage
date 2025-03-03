import { describe, beforeEach, it, expect } from "vitest";
import * as PImage from "../../src/index.js";
import { save } from "../common.js";

describe("bug-198", () => {
    it("should draw lines", async () => {
        const image = PImage.make(200, 200);
        const ctx = image.getContext("2d");
        ctx.strokeStyle = "red";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.rect(20, 20, 30, 50);
        ctx.stroke();

        await save(image, "bug/211");

    })
})
