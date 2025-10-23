# microservices: the hype, the hangover, the middle ground

when i started out (~8 years ago), every job spec said “microservices.” we broke monoliths into tiny boxes, drew neat diagrams, we talked about strangler patterns, decomposition, branching by abstraction, it felt so academic and serious, we felt like real engineers.

a few years later, i see the opposite every day on linkedin

## why the hype made sense
- **team autonomy.** small services, small blast radius, ship independently.
- **fast fast FAST deploys.** i strongly maintain that there is no better devX than a seriously quick deploy, there's probably another sloppy blog post in the works about the relationship between deploy speed and team velocity on half your projects
- **right tool for the job.** pick the language/storage that fits the feature.
- **scaling.** scale hot paths without scaling everything, leverage serverless to seriously save money

all true. all useful. but the fine print mattered.

## what hurts?
- **complexity tax.** 12 services became 120; each needed ci, deploy, logging, metrics, alerts, dashboards.
- **ops gravity.** service discovery, retries, backoff, circuit breakers, tls—everywhere.
- **data consistency.** “just use events” turned into glue code and mystery queues.
- **latency + costs.** extra hops, extra bills. debugging in distributed land took longer.
- **org fit.** a lot of “microservices” were still one big team pretending otherwise.

## the pendulum swing
so people did the obvious thing: **fewer services, fatter services, better boundaries.** the phrase “modular monolith” reappeared. i don’t think microservices “failed”; we just learned where they’re worth it.

## my working rule of thumb
- **monolith (modular):** new products, small teams, frequent changes, unknown domain.
- **a few services:** clear domain seams (auth, billing, media pipeline), separate ownership, real scaling/latency constraints.
- **lots of services:** platform orgs with strong tooling, paved roads, and the budget/discipline to run them.

> simple first. split when it’s obviously better. focus on gaining value from every split, not killing yourself to split on principal

> draw fewer boxes than you want to—then let real pain justify every new one.

it feels like we're in a strange liminal space right now where, when asked in an interview, i have to try and ascertain which school of thought my interviewer adheres to, and that's a bad thing if you ask me. my youtube algorithm has shifted from [Mastering Chaos - A Netflix Guide to Microservices](https://www.youtube.com/watch?v=CZ3wIuvmHeM) to [Microservices are Technical Debt](https://www.youtube.com/watch?v=LcJKxPXYudE) over the course of a few short years. the pendulum has swung from a wierd obsession in one direction to the other. i think we need to be reasonable before we make the same mistake with the next trend (i refuse to mention AI).

it reminds me a bit of the cargo cult of test-driven-development (when candidates in an interview ask if they should start their coding challenge with tests, i politely let them know that we don't need to worry about pretending that we like TDD here)

the fashion changed; the fundamentals didn’t. good boundaries, good tooling, boring deploys. the rest is just diagram style.
