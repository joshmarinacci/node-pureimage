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

  // like OffscreenCanvas, whose context type is a WebIDL enum, unknown types throw
  it("getContext throws TypeError for an invalid contextType", () => {
    expect(() => image.getContext("this is totally made up")).toThrow(TypeError);
  });

  it("getContext is case sensitive", () => {
    expect(() => image.getContext("2D")).toThrow(TypeError);
  });

  it("getContext throws TypeError for the empty string", () => {
    expect(() => image.getContext("")).toThrow(TypeError);
  });

  it("getContext without arguments throws TypeError", () => {
    expect(() => image.getContext()).toThrow(TypeError);
  });

  it("context.canvas is valid", () => {
    expect(context.canvas).toEqual(image);
  });
});
