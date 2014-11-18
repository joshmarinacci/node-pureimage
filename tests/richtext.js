var fs = require('fs');
var PImage = require('../src/pureimage');
var comp = require('richtext');
var Document = comp.Document;

function makeStyledJSDoc() {
    var frame = Document.makeFrame();
    frame.styles = {
        'bold': {
            'font-style':'normal',
            'font-family':"Source Sans Pro",
            'font-weight':'700',
        },
        'italic': {
            'font-style':'italic',
            'font-family':"Source Sans Pro",
        },
        'code': {
            'color':'#000000',
            'font-family':"Source Sans Pro",
            'background-color':'#ccffee',
        },

        'paragraph': {
            'color':'#000000',
            'font-size':15,
            'font-family':"Source Sans Pro",
            'font-style':'normal',
            'background-color':'#ffffff',
            'font-weight':'400',
            'block-padding':15,
            'border-color':'#000000',
        },
        'header': {
            'font-size':30,
            'font-family':"Source Sans Pro",
            'block-padding':10,
        },
        'subheader': {
            'font-size':20,
            'font-family':"Source Sans Pro",
            'block-padding':10,
        },
        'left': {
            'font-size':25,
            'font-family':"Source Sans Pro",
            'block-padding':10,
            'text-align':'left',
        },
        'center': {
            'font-size':25,
            'font-family':"Source Sans Pro",
            'block-padding':10,
            'text-align':'center',
        },
        'right': {
            'font-size':25,
            'font-family':"Source Sans Pro",
            'block-padding':10,
            'text-align':'right',
        },
    }

    var blk = frame.insertBlock();
    blk.stylename = 'paragraph';
    blk.insertSpan("This is some plain text");
    blk.insertSpan(" italic,").stylename = 'italic';
    blk.insertSpan(" bold,").stylename = 'bold';
    blk.insertSpan(" and code,").stylename = 'code';
    blk.insertSpan(" yet again.");
    blk.insertSpan(" And now for a really long span that will have to be wrapped."
    +" It really is pretty long, don't you think?");
    var blk = frame.insertBlock();
    blk.stylename = 'header';
    blk.insertSpan("This is a header");
    var blk = frame.insertBlock();
    blk.stylename = 'subheader';
    blk.insertSpan("This is a sub header");

    var blk = frame.insertBlock();
    blk.stylename = 'paragraph';
    blk.insertSpan("Another paragraph of text is here. I think this is pretty cool. Don't you think so? Let's type some more so that the text will wrap.");
    var blk = frame.insertBlock();
    blk.stylename = 'paragraph';
    blk.insertSpan("Another paragraph of text is here. I think this is pretty cool. Don't you think so? Let's type some more so that the text will wrap.");
    return frame;
}


var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
fnt.load(function() {

    var img = PImage.make(800,600);
    var ctx = img.getContext('2d');
    ctx.fillStyle = '#00ff00';
    //ctx.setFillStyleRGBA(0,255,0, 1);

    var config = {
        context:ctx,
        frame:makeStyledJSDoc(),
        width:  600,
        height: 400,
        charWidth : function(ch,
                font_size,
                font_family,
                font_weight,
                font_style
            ) {
            ctx.setFont(font_family,font_size);
            return ctx.measureText(ch).width;
        },

    }

    var rte = comp.makeRichTextView(config);
    rte.relayout();
    rte.redraw();


    PImage.encodePNG(img, fs.createWriteStream("build/richtext.png"), function(){
        console.log("rendered build/richtext.png");
    });

});
