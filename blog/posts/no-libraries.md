this site, and by extension, this "blog" (extremely glorified name) is written according to one specific rule. i want everything to be written as simply as possible.

likely not a particularly good idea but i want to under-engineer whenever possible, mostly because writing a front-end is something i rarely do, so changing things up is a win for me.

i find this kind of under-engineering pretty fun and invigorating, being able to cut to the good stuff immediately instead of worrying about which npm package i should start googling for.

# the how

overall, i think i might have found the absolute simplest, smoothest workflow for hosting your own static site

1 - create a pure static index.html file, and push it to a github repo, punch it up with css and a script or 2 if you fancy

2 - use netlify to host your github repository (it has beautiful smart defaults which automatically detect and host your index.html)

3 - (optional) pay for your own domain and set up an Aname record to map it

4 - push whatever nonsense you want onto the internet for the world to see

i didn't even need to install node on my PC (fate worse than death for windows users).

if i was wearing my professional software engineer hat, i would have immediately started thinking about frameworks, effective hosting solutions, scaling and extensibility - 'what happens if i want to add comments? - i could host a sqlite database but how would i prevent it from being spammed - maybe using firebase would be quick and effective, i could use the built-in auth to prevent people from spamming, or add a rate limiter or a...........' 

there's something pleasant about just choosing to wing it.

for that reason when i wanted to host blog content on here as well, i thought about just literally adding a new html page and adding a new html page (some sort of interconnected web of *hyper* - *text* ? tim berners-lee would be proud), but i figured that manually writing html tags for a blog might be the only thing less appealing than actually blogging, so i thought about hosting md files instead

maybe using a library to host md files but still be able to custom style them and keep them aligned to whatever (surely terrible) website design i had gone for most recently.

eventually i realised that (like many problems in software engineering), this is essentially just a string manipulation problem and could be solved with pure regex (if you wanted to torture yourself in that way). LLMs are great at regex, and i can plug the rest in together, and voila!

the final product is a simple html page that calls a js parser, it's ~100 lines of vanilla javascript and converts my md files into html strings, which i can then render within this page.

# added bonuses 
(and how this really just aligns with my personal philosophies)

* **performance!** honestly one thing i absolutely despise whilst browsing the internet in 2025 is that reading a simple blog involves so much faff, the page loads take multiple seconds, there's inevitably a laggy cookie popup and a login-to-keep-reading modal and a hideous "share to social" tab that appears on highlight (seriously medium, does anyone use that?)
my knowledge of modern browser libraries and frameworks is extremely limited, but apparently that's what makes writing a simple performant site much easier(?!)

* **scope discipline** i can't go over the top with wanting to write wacky features if i'm limited by a) markdown's spec, and b) what i'm comfortable writing into the regex of the parser

* **absolute freedom** in contrast to the previous point, if i want to go mad with it, i'm absolutely free to, and maybe (hopefully) i will in the future

* **portability and longevity** my previous iteration of this website remained untouched for over 7 years and nothing broke, nothing slowed down, no dependency errors appeared.
hosting static html and deterministic js should last forever


# honest trade-offs 
(and why i’m fine with them)

* **not spec-perfect:** i don’t support every dialect or edge case. that’s a feature, not a bug, for a solo blog. when i want to add some images, i need to make a change, and i can learn something that i'd never normally touch in the process.
* **no community plugins:** when i want a new trick, i write it. the upside is i only add what i’ll use twice.
* **beware untrusted input:** if i ever accept comments or guest posts, i’ll sanitize or switch to a hardened pipeline. until then, the author is me and the threat model is me.

# the principle

> it was easy, it was fun, nobody got hurt and i learned something new. i would have shortcut all of that if i imported a library and cut to the end (and it probably loads faster, too)
