PureImage
==============

PureImage is a pure JavaScript implementation of an image drawing and encoding
API, based on HTML Canvas, for NodeJS. It has no native dependencies.
  
# note, pure image is being refactored

* set pixels
* stroke and fill paths (rectangles, lines, quadratic curves, not bezier yet)
* copy and scale images (nearest neighbor)
* import and export JPG and PNG from streams using promises
* render basic text (no bold or italics yet)

On the roadmap, but still missing
===============

* gradients
* alpha composites
* complex fonts
* bezier curves, stroked and filled (broken)
* anti-aliased lines and curves (broken)
* full alpha compositing
* loading and styled fonts
* measure text
* transforms


Why?
====

The are more than enough drawing APIs out there. Why do we need another? My
personal hatred of C/C++ compilers is widely known. The popular
Node modules [Canvas.js](https://github.com/Automattic/node-canvas) does a great
job, but it's backed by Cairo, a C/C++ layer. I hate having native dependencies
in Node modules. They often don't compile, or break after a system update. They
often don't support non-X86 architectures (like the Raspberry Pi). You have
to have a compiler already installed to use them, along with any other native
dependencies preinstalled (like Cairo).  

So, I made PureImage. It's goal is to implement the HTML Canvas spec in a headless
Node buffer. No browser or window required.

PureImage is meant to be a small and maintainable Canvas library.
It is *not meant to be fast*.  If there are two choices of algorithm we will
take the one with the simplest implementation, and preferably the fewest lines.
We avoid special cases and optimizations to keep the code simple and maintainable.
It should run everywhere and be highly portable. But it will not be fast. If you
need speed go use Canvas.js.

PureImage uses only pure JS dependencies.  [OpenType](https://github.com/nodebox/opentype.js/)
for font parsing, [PngJS](https://github.com/niegowski/node-pngjs) for PNG import/export, 
and [jpeg-js](https://github.com/eugeneware/jpeg-js) for JPG import/export.



Examples
=========


Make a new empty image, 100px by 50px. Automatically filled with 100% opaque black.

```
var PImage = require('pureimage');
var img1 = PImage.make(100,50);
```

Fill with a red rectangle, 50% opacity

```
var ctx = img1.getContext('2d');
ctx.setFillStyleRGBA(255,0,0, 0.5);
ctx.fillRect(0,0,100,100);
```

Write out to a PNG file (uses `pngjs`)

```
PImage.encodePNGToStream(img1, fs.createWriteStream('out.png')).then(()=> {
    console.log("wrote out the png file to out.png");
}).catch((e)=>{
    console.log("there was an error writing");
});
```

Read a jpeg, resize it, then save it out

```
PImage.decodeJPEGFromStream(fs.createReadStream("tests/images/bird.jpg")).then((img)=>{
    console.log("size is",img.width,img.height);
    var img2 = PImage.make(50,50);
    var c = img2.getContext('2d');
    c.drawImage(img,
        0, 0, img.width, img.height, // source dimensions
        0, 0, 50, 50   // destination dimensions
    );
    var pth = path.join(BUILD_DIR,"resized_bird.jpg");
    PImage.encodeJPEGToStream(img2,fs.createWriteStream(pth)).then(()=> {
        console.log("done writing");
    });
```




Thanks!
===============

Thanks to Nodebox / EMRG for [opentype.js](https://github.com/nodebox/opentype.js/)

Thanks to Rosetta Code for [Bresenham's in JS](http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#JavaScript)

Thanks to Kuba Niegowski for [PngJS](https://github.com/niegowski/node-pngjs)

Thanks to Eugene Ware for [jpeg-js]( https://github.com/eugeneware/jpeg-js )


