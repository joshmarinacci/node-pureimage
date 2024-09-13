import { describe, beforeEach, expect, it } from "vitest";
import * as pureimage from "../src/index";

describe("context", () => {
  let image;
  let context;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    context = image.getContext("2d");
  });

  it("getContext returns the same context", () => {
    expect(image.getContext("2d")).to.eq(context);
  });

  it("getContext returns null for invalid contextType", () => {
    expect(image.getContext("this is totally made up")).to.eq(null);
  });

  it("context.canvas is valid", () => {
    expect(context.canvas).toEqual(image);
  });
});
