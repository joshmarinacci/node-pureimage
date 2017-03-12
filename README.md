PureImage
==============

PureImage is a pure JavaScript implementation of an image drawing and encoding
API, based on HTML Canvas, for NodeJS. It has no native dependencies.  

Current features:

* set pixels
* stroke and fill paths (rectangles, lines, quadratic curves)
* copy images
* load from PNG and JPG
* export to PNG and JPG
* render text (no bold or italics yet)


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
for font parsing and [PngJS](https://github.com/niegowski/node-pngjs) for PNG export.



Examples
=========


Make a new empty image, 100px by 50px. Automatically filled with 100% opaque black.

```
var PImage = require('pureimage');
var img1 = PImage.make(100,50);
```

Fill with a red rectangle with 50% opacity

```
var ctx = img1.getContext('2d');
ctx.fillStyle = 'rgba(255,0,0,0.5)';
ctx.fillRect(0,0,100,100);
```

Write out to a PNG file (uses `pngjs`)

```
PImage.encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
    console.log("wrote out the png file to out.png");
});
```



On the roadmap
===============


* *done* drawing text from truetype files. Have to figure out a pure JS font rasterizer
* *done*: quadratic curves
* bezier curves, stroked and filled
* anti-aliased curves (partially done)
* full alpha compositing
* *done* PNG loading for compositing
* *mostly done* Jpeg input/output


Thanks!
===============

Thanks to Nodebox / EMRG for [opentype.js](https://github.com/nodebox/opentype.js/)

Thanks to Rosetta Code for [Bresenham's in JS](http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#JavaScript)

Thanks to Kuba Niegowski for [PngJS](https://github.com/niegowski/node-pngjs)

Thanks to Eugene Ware for [jpeg-js]( https://github.com/eugeneware/jpeg-js )


Notes
==========

* move font stuff to pure image,
* make a registerFont,
* setFont(name,size,weight,style,variant),
* and drawString function,
* and measureText
