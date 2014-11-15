var fs = require('fs');

var file = fs.readFileSync(process.argv[2]).toString();
console.log('chars = ',file.length);
var lines = file.split('\n');
console.log('lines = ',lines.length);

var code = lines.filter(function(line){
    //comments
    if(line.match(/^\s*\/\//)) {
        return false;
    }
    if(line.match(/^\s*$/)) {
        return false;
    }
    return true;
});

console.log('code lines = ',code.length);

/*

    added selection support
2014-08-20: 416, 414,
    403 (remove tree dump)
    398 (inlined calcSize)
    411 (added unified bg and text block)
    406 (automate setting default text properties)
    445 (add clipboard, fix selection markers, condense line breaking code)
    390 (removed block system)
    376 (switch to pair system, more cleanup)
    340 (more cleanup, remove some chaining returns)
2014-08-27:
    391: after adding bunch of new stuff, did a bunch of cleanup
    397: moved selection, clipboard, and cursor into their own classes

*/
