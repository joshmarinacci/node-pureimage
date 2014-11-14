
var p = [
    {x:0,y:0},
    {x:30,y:30},
    {x:30,y:30},
];

function calcQuadraticAtT(points, t) {

//    var t = 0.5; // given example value
    var x = (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x;
    var y = (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y;
    return {x:x,y:y};
}
console.log("output = ", calcQuadraticAtT(p,0.5));
