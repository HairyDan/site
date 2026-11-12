(() => {
  self.FractalPlaces={
    overview:{x:-.65,y:0,scale:3.4,kind:0,note:"the familiar one. the interesting bits tend to be right on the edge, where a tiny move can change whether a point escapes at all."},
    seahorse:{x:-.7435,y:.1314,scale:.009,kind:0,note:"seahorse valley. keep following the curled edges. this is usually where i stop pretending i'm only going to look for five minutes."},
    spiral:{x:-.7463,y:.1102,scale:.002,kind:0,note:"a smaller detour off the same coastline. zoom into one of the curls, then try finding your way back without resetting."},
    julia:{x:0,y:0,scale:3.2,kind:1,jx:-.8,jy:.156,note:"one fixed number, repeated over and over. try nudging the real or imaginary part by .001. the whole shape can change."},
    rabbit:{x:0,y:0,scale:4.2,kind:1,jx:-.123,jy:.745,note:"the douady rabbit, or a nearby approximation of it. three lobes, then smaller copies, then smaller copies of those. a pleasingly unreasonable amount of rabbit."},
    basilica:{x:0,y:0,scale:3.6,kind:1,jx:-1,jy:0,note:"the basilica. two big rooms, an awful lot of smaller rooms. all from repeatedly squaring a number and subtracting one."},
    dust:{x:0,y:0,scale:3.4,kind:1,jx:.285,jy:.01,note:"julia dust. the connected-looking creature breaks into islands. try bringing the real part back towards .25 and see what holds together."},
    ship:{x:-.45,y:-.5,scale:3.4,kind:2,note:"burning ship. take the absolute values before squaring and the soft little mandelbrot suddenly grows masts and rigging. the smaller ships are down near the bottom."},
    'ship-detail':{x:-1.76,y:-.035,scale:.15,kind:2,note:"down among the smaller ships. the straight lines feel like they should have been drawn deliberately. they weren't."},
    tricorn:{x:0,y:0,scale:6,kind:3,note:"the tricorn. flip the imaginary part before squaring and the familiar two-sided shape turns into this three-armed thing. a very small change to the rule, a rather large change to the coastline."},
    cubic:{x:0,y:0,scale:4.4,kind:4,note:"square it? cube it instead. this is the cubic multibrot set. same question about escaping, different symmetry, and another whole set of edges to disappear into."},
    newton:{x:0,y:0,scale:4,kind:5,note:"this one is trying to solve z³ = 1. each colour belongs to one of the three answers. the messy bits are starting points that nearly disagree about where to end up. zoom into a border."}
  };
  self.FractalNotes=[
    "each pixel gets its own c in z² + c. dark points haven't escaped yet. shift-click any point to see its julia set, or try the centre of your current view.",
    "same z² + c, but now c stays fixed and every pixel is a different starting point. the two little number boxes change the whole world.",
    "absolute values before squaring. try the lower edge for smaller ships, or pick the shipyard from the menu.",
    "conjugate z, then square it and add c. the tricorn has three arms and some very strange edges.",
    "z³ + c this time. one extra multiplication gives you a different symmetry and plenty of new places to get lost.",
    "newton's method for z³ − 1. colour tells you which root a point reaches; the shading also changes with how long it takes. dark points didn't converge within the limit."
  ];
})();