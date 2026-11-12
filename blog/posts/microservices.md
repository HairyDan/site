when i started out (~8 years ago), every job spec said "microservices". we broke monoliths into tiny boxes, drew neat diagrams, talked about strangler patterns, decomposition, branching by abstraction. it felt so academic and serious, we felt like real engineers.

a few years later, i see the opposite every day on linkedin. apparently we should have kept the monolith.

i don't think we imagined the benefits. being able to deploy a small change without taking the whole application along with it is lovely. i strongly maintain that there is no better devX than a seriously quick deploy, there's probably another sloppy blog post in the works about that. being able to scale the bit that's actually busy is useful too.

but you do have to run all the things you've drawn boxes around. each one needs a deployment pipeline, logs, alerts, some way of finding out why it's broken. then you need to find out why three perfectly healthy services are failing to do something between them. "just use events" is doing quite a lot of work in some of these conversations.

and if the same team owns all of it, and a feature still means coordinating changes across five repos, i'm not sure how much independence you've bought yourself. you've certainly given yourself more places to look.

i can see why people started putting things back together. i just find it odd that we've managed to turn that into another thing to be dogmatic about.

a small team working out what a product even is probably has enough to do already. keeping it together makes sense to me. if a part of it needs to scale separately, or another team needs to own and deploy it, there's a reason to split it out. i'd want to know what that split was going to make easier before spending time on it.

it feels like we're in a strange place with interviews at the moment, where i have to try and work out which school of thought my interviewer adheres to before answering an architecture question. that's a bad thing if you ask me. i want to talk about the problem, but there's this little distraction of trying to work out whether the word "microservice" is going to get me points or lose them.

it reminds me a bit of the cargo cult of test-driven-development (when candidates in an interview ask if they should start their coding challenge with tests, i politely let them know that we don't need to worry about pretending that we actually follow TDD strictly (a practice which only ever seems to appear in job interviews)).

my youtube algorithm has shifted from [Mastering Chaos - A Netflix Guide to Microservices](https://www.youtube.com/watch?v=CZ3wIuvmHeM) to [Microservices are Technical Debt](https://www.youtube.com/watch?v=LcJKxPXYudE) over the course of a few short years. the pendulum has swung from a weird obsession in one direction to the other. i think we need to be reasonable before we make the same mistake with the next trend (i refuse to mention AI).
