console.log(
  "we are in the browser. No need to do anything. Just use new Canvas()",
);

export function make(width, height) {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
