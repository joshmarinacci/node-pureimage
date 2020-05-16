[![Build Status](https://travis-ci.org/joshmarinacci/node-pureimage.svg?branch=master)](https://travis-ci.org/joshmarinacci/node-pureimage)

PureImage
==============

PureImage is a pure JavaScript implementation of the HTML Canvas 2d drawing api for NodeJS.
It has no native dependencies.


New 0.1.x release
=================

I've completely refactored the code so that it should be easier to
maintain and implement new features. For the most part there are no API changes (since the API is
 defined by the HTML Canvas spec), but if you
were using the font or image loading extensions
you will need to use the new function names and switch to promises. For more information, please see [the API docs](http://joshmarinacci.github.io/node-pureimage)

I'm also using Node buffers instead of arrays internally, so you can work with large images
faster than before. Rich text is no longer supported, which is fine because it never really worked
anyway. We'll have to find a different way to do it.

I've tried to maintain all of the patches that have been sent in, but if you contributed a patch
please check that it still works. Thank you all!  - josh



## supported Canvas Features

* set pixels
* stroke and fill paths (rectangles, lines, quadratic curves, bezier curves, arcs/circles)
* copy and scale images (nearest neighbor)
* import and export JPG and PNG from streams using promises
* render basic text (no bold or italics yet)
* anti-aliased strokes and fills
* transforms
* standard globalAlpha and rgba() alpha compositing
* clip shapes


On the roadmap, but still missing
=================================

* gradients fills
* image fills
* blend modes besides SRC OVER
* smooth clip shapes
* bold/italic fonts
* measure text
* smooth image interpolation


Why?
====

The are more than enough drawing APIs out there. Why do we need another? My
personal hatred of C/C++ compilers is [widely known](https://joshondesign.com/2014/09/17/rustlang).
The popular Node modules [Canvas.js](https://github.com/Automattic/node-canvas) does a great
job, but it's backed by Cairo, a C/C++ layer. I hate having native dependencies
in Node modules. They often don't compile, or break after a system update. They
often don't support non-X86 architectures (like the Raspberry Pi). You have
to have a compiler already installed to use them, along with any other native
dependencies pre-installed (like Cairo).

So, I made PureImage. It's goal is to implement the HTML Canvas spec in a headless
Node buffer. No browser or window required.

PureImage is meant to be a small and maintainable Canvas library.
It is *not meant to be fast*.  If there are two choices of algorithm we will
take the one with the simplest implementation, and preferably the fewest lines.
We avoid special cases and optimizations to keep the code simple and maintainable.
It should run everywhere and be always produce the same output. But it will not be
fast. If you need speed go use something else.

PureImage uses only pure JS dependencies.  [OpenType](https://github.com/nodebox/opentype.js/)
for font parsing, [PngJS](https://github.com/niegowski/node-pngjs) for PNG import/export,
and [jpeg-js](https://github.com/eugeneware/jpeg-js) for JPG import/export.

Documentation
=============
Documentation can now be found at: http://joshmarinacci.github.io/node-pureimage

Examples
=========


Make a new empty image, 100px by 50px. Automatically filled with 100% opaque black.

```js
var PImage = require('pureimage');
var img1 = PImage.make(100,50);
```

Fill with a red rectangle with 50% opacity

```js
var ctx = img1.getContext('2d');
ctx.fillStyle = 'rgba(255,0,0, 0.5)';
ctx.fillRect(0,0,100,100);
```

Fill a green circle with a radius of 40 pixels in the middle of a 100px square black image.

```js
var img = PImage.make(100,100);
var ctx = img.getContext('2d');
ctx.fillStyle = '#00ff00';
ctx.beginPath();
ctx.arc(50,50,40,0,Math.PI*2,true); // Outer circle
ctx.closePath();
ctx.fill();
```

![image of arcto with some fringing bugs](firstimages/arcto.png)

Draw the string 'ABC' in white in the font 'Source Sans Pro', loaded from disk, at a size
of 48 points.

```js
test('font test', (t) => {
    var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
    fnt.load(() => {
        var img = PImage.make(200,200);
        var ctx = img.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = "48pt 'Source Sans Pro'";
        ctx.fillText("ABC", 80, 80);
    });
});
```


Write out to a PNG file

```js
PImage.encodePNGToStream(img1, fs.createWriteStream('out.png')).then(() => {
    console.log("wrote out the png file to out.png");
}).catch((e)=>{
    console.log("there was an error writing");
});
```

Read a jpeg, resize it, then save it out

```js
PImage.decodeJPEGFromStream(fs.createReadStream("tests/images/bird.jpg")).then((img) => {
    console.log("size is",img.width,img.height);
    var img2 = PImage.make(50,50);
    var c = img2.getContext('2d');
    c.drawImage(img,
        0, 0, img.width, img.height, // source dimensions
        0, 0, 50, 50                 // destination dimensions
    );
    var pth = path.join(BUILD_DIR,"resized_bird.jpg");
    PImage.encodeJPEGToStream(img2,fs.createWriteStream(pth), 50).then(() => {
        console.log("done writing");
    });
});
```



Thanks!
===============

Thanks to Nodebox / EMRG for [opentype.js](https://github.com/nodebox/opentype.js/)

Thanks to Rosetta Code for [Bresenham's in JS](http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#JavaScript)

Thanks to Kuba Niegowski for [PngJS](https://github.com/niegowski/node-pngjs)

Thanks to Eugene Ware for [jpeg-js]( https://github.com/eugeneware/jpeg-js )

Thanks for patches from:

* Dan [danielbarela](https://github.com/danielbarela)
* Eugene Kulabuhov [ekulabuhov](https://github.com/ekulabuhov)
* Lethexa [lethexa](https://github.com/lethexa)
* The Louie [the-louie](https://github.com/the-louie)
* Jan Marsch [kekscom](https://github.com/kekscom)
