//var c = document.getElementById("myCanvas");
//c.width = window.innerWidth;
//c.height = window.innerHeight;
//var ctx = c.getContext("2d");
//ctx.fillStyle="#CCCCCC";
//ctx.fillRect(0,0,c.width,c.height);
/*
for (i = 1; i < 5; i++) {
  ctx.beginPath();
  ctx.arc(c.width/5*i, c.height/2, 20, 0, 2*Math.PI);
  ctx.fillStyle = "gray";
  ctx.fill();
}*/
var bod = document.getElementById("raphdiv");
var paper = Raphael(bod, "100%", "80%");
var circle1 = paper.circle("20%", "40%", 30);
var defaultcirc = [
    {
        fill: "#aaa",
        stroke: "#eee",
        "stroke-width": 2

    }
];
circle1.attr(defaultcirc);
c1text = paper.text("20%", "40%", "CV").attr({fill: '#888888', "font-size":20, "font":""});
c1text.transform("T0,-37");
c1text.node.setAttribute('class', 'raphtext');
var circle2 = paper.circle("40%", "40%", 30);
circle2.attr(defaultcirc);
c2text = paper.text("40%", "40%", "Bio").attr({fill: '#888888', "font-size":20, "font":""});
c2text.transform("T0,-37");
c2text.node.setAttribute('class', 'raphtext');
var circle3 = paper.circle("60%", "40%", 30);
circle3.attr(defaultcirc);
c3text = paper.text("60%", "40%", "Portfolio").attr({fill: '#888888', "font-size":20, "font":""});
c3text.transform("T0,-37");
c3text.node.setAttribute('class', 'raphtext');
var circle4 = paper.circle("80%", "40%", 30);
circle4.attr(defaultcirc);
circle4.attr({href: "https://www.linkedin.com/in/daniel-schormans-57064015b/"});
c4text = paper.text("80%", "40%", "Contact").attr({fill: '#888888', "font-size":20, "font":"", href: "https://www.linkedin.com/in/daniel-schormans-57064015b/"});
c4text.transform("T0,-37");
c4text.node.setAttribute('class', 'raphtext');
var circles = [];
circles.push(circle1);
circles.push(circle2);
circles.push(circle3);
circles.push(circle4);

function transitionto2(circ, text) {
    circ.animate({ fill: "#E55B13", stroke: "#F6A21E", "stroke-width": 5 }, 200);
    text.animate({fill: "#E55B13"}, 200);
}

function transitiontodefault(circ, text) {
    circ.animate({ fill: "#aaa", stroke: "#eee", "stroke-width": 2 }, 200);
    text.animate({fill: "#888"}, 200);
}

circle1.hover(function (evt) {
    transitionto2(circle1, c1text);
}, function (outevt) {
    transitiontodefault(circle1, c1text);
});
c1text.hover(function (evt) {
    transitionto2(circle1, c1text);
}, function (outevt) {
    transitiontodefault(circle1, c1text);
});
circle2.hover(function (evt) {
    transitionto2(circle2, c2text);
}, function (outevt) {
    transitiontodefault(circle2, c2text);
});
c2text.hover(function (evt) {
    transitionto2(circle2, c2text);
}, function (outevt) {
    transitiontodefault(circle2, c2text);
});

circle3.hover(function (evt) {
    transitionto2(circle3, c3text);
}, function (outevt) {
    transitiontodefault(circle3, c3text);
});
c3text.hover(function (evt) {
    transitionto2(circle3, c3text);
}, function (outevt) {
    transitiontodefault(circle3, c3text);
});
circle4.hover(function (evt) {
    transitionto2(circle4, c4text);
}, function (outevt) {
    transitiontodefault(circle4, c4text);
});
c4text.hover(function (evt) {
    transitionto2(circle4, c4text);
}, function (outevt) {
    transitiontodefault(circle4, c4text);
});