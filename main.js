var c = document.getElementById("myCanvas");
c.width = window.innerWidth;
c.height = window.innerHeight;
var ctx = c.getContext("2d");
//ctx.fillStyle="#CCCCCC";
//ctx.fillRect(0,0,c.width,c.height);
/*
for (i = 1; i < 5; i++) {
  ctx.beginPath();
  ctx.arc(c.width/5*i, c.height/2, 20, 0, 2*Math.PI);
  ctx.fillStyle = "gray";
  ctx.fill();
}*/

var paper = Raphael(0, 0, c.width, c.height);
var circle1 = paper.circle(c.width / 5, c.height / 2, 30);
var defaultcirc = [
    {
        fill: "#aaa",
        stroke: "#eee",
        "stroke-width": 2
    }
];
circle1.attr(defaultcirc);
var circle2 = paper.circle(c.width / 5 * 2, c.height / 2, 30);
circle2.attr(defaultcirc);
var circle3 = paper.circle(c.width / 5 * 3, c.height / 2, 30);
circle3.attr(defaultcirc);
var circle4 = paper.circle(c.width / 5 * 4, c.height / 2, 30);
circle4.attr(defaultcirc);
var circles = [];
circles.push(circle1);
circles.push(circle2);
circles.push(circle3);
circles.push(circle4);

function transitionto2(circ) {
    circ.animate({ fill: "#E55B13", stroke: "#F6A21E", "stroke-width": 5 }, 200);
}

function transitiontodefault(circ) {
    circ.animate({ fill: "#aaa", stroke: "#eee", "stroke-width": 2 }, 200);
}

circle1.hover(function (evt) {
    transitionto2(circle1);
}, function (outevt) {
    transitiontodefault(circle1);
});
circle2.hover(function (evt) {
    transitionto2(circle2);
}, function (outevt) {
    transitiontodefault(circle2);
});
circle3.hover(function (evt) {
    transitionto2(circle3);
}, function (outevt) {
    transitiontodefault(circle3);
});
circle4.hover(function (evt) {
    transitionto2(circle4);
}, function (outevt) {
    transitiontodefault(circle4);
});
