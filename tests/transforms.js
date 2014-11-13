var trans = require('../src/transform');

var t = new trans.Transform();
console.log(t);
t.translate(100,50);
t.rotate(0);
console.log(t);
console.log(t.transformPoint(5,5));
t.rotate(45*Math.PI/180);
console.log(t.transformPoint(5,5));

t.save();
t.rotate(45*Math.PI/180);
console.log(t.transformPoint(5,5));
t.restore();
console.log(t.transformPoint(5,5));
