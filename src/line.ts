import { Point, PointIsh } from "./point.js";
import { hasOwnProperty } from "./util.js";

type LineConstructorOptions =
  /** Construct a Line using two {@link Point} objects */
  | [Point, Point]
  /** Construct a Line using 4 {@link number}s */
  | [number, number, number, number];

/**
 * Create a line object represnting a set of two points in 2D space.
 *
 * Line objects can be constructed by passing in either 4 numbers (startX, startY, endX, endY) - or
 * two {@link Point} objects representing `start` and `end` respectively
 */
export class Line {
  start: Point | PointIsh;
  end: Point | PointIsh;

  constructor(...args: LineConstructorOptions) {
    if (args.length === 4) {
      this.start = {};

      this.end = {};

      [this.start.x, this.start.y, this.end.x, this.end.y] = args;
      for (const argument_index in args) {
        if (hasOwnProperty.call(args, argument_index)) {
          const argument = args[argument_index];
          if (typeof argument !== "number") {
            throw TypeError(
              "When passing 4 arguments, only numbers may be passed",
            );
          }
        }
      }
    } else if (args.length === 2) {
      [this.start, this.end] = args;
    } else {
      throw Error(
        "Please pass either two Point objects, or 4 integers to the constructor",
      );
    }
  }

  /** Get the line length */
  getLength() {
    return Math.sqrt(
      Math.pow(this.start.x - this.end.x, 2) +
        Math.pow(this.start.y - this.end.y, 2),
    );
  }

  is_invalid() {
    if (Number.isNaN(this.start.x)) return true;
    if (Number.isNaN(this.end.x)) return true;
    if (Number.isNaN(this.start.y)) return true;
    if (Number.isNaN(this.end.y)) return true;
    if (this.start.x > Number.MAX_SAFE_INTEGER) return true;
    if (this.start.y > Number.MAX_SAFE_INTEGER) return true;
    if (this.end.x > Number.MAX_SAFE_INTEGER) return true;
    if (this.end.y > Number.MAX_SAFE_INTEGER) return true;
    return false;
  }
}

/** @ignore */
