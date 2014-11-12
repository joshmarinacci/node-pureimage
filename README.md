node-pureimage
==============

Pure JS implementation of an image drawing and encoding api, based on HTML Canvas

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
PImage.encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
    console.log("wrote out the png file to out.png");
});
```



On the roadmap
===============


* drawing text from truetype files. Have to figure out a pure JS font rasterizer
* bezier curves, stroked and filled
* alpha compositing
* PNG loading for compositing
* Jpeg input/output



