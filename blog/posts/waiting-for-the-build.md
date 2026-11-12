i'm interested in how much more useful work i can actually get done with ai. getting a change written, checked and released, then being able to come back to it tomorrow and understand what happened. the time spent waiting and getting my head back into things matters quite a lot to that.

i keep coming back to ci/cd when people talk about ai productivity, which probably isn't the exciting bit of the conversation.

before any of this, i thought the most important bottleneck in a software team's workflow was how quickly you could get a change built, checked and deployed. i briefly went on about this in [microservices, macrotrends](/blog/post.html?slug=microservices). there is very little that makes me happier at work than a seriously quick deploy.

i think that matters even more now.

say it takes an hour to write a change, and another hour to build it, run the tests and get it released. completely made-up numbers, but easy ones to work with. half the elapsed time is spent getting the thing through the pipeline.

now make the writing part faster:

- an hour writing, an hour in the pipeline: 50% of the time is the pipeline.
- a minute writing, an hour in the pipeline: about 98.36%.
- a second writing, an hour in the pipeline: about 99.97%.

the percentage approaches 100%. the ratio of waiting time to writing time can keep growing without a limit. at one second of writing you're waiting 3,600 times as long as you spent making the change.

which is quite a good way of making an impressive demo feel less impressive during an actual working day.

there's another slightly depressing bit of maths here. even if the writing becomes instantaneous, that example still takes an hour. the original process took two hours, so you're capped at a 2x improvement overall. making the code appear faster won't get you past that remaining hour.

obviously a real team has work happening in parallel, reviews, failed builds and all sorts of other interruptions, so this is a very small model of a very untidy thing. but i think it's useful when we're talking about how much faster the whole job is getting.

while i'm waiting for a build, it's tempting to start something else. then the first thing needs attention, but i've got my head into the second thing, and now i'm trying to remember what i was doing. generating more changes gives me more opportunities to do that to myself.

so i still want fast, useful feedback. tell me i've broken something while i'm thinking about the change. give me checks i can trust, and a straightforward way to get the result deployed. being able to do that independently for a small service is one of the things i still like about microservices. the diagram on its own doesn't buy you much.

the waiting also leaves me with more work in flight, and more of it to keep in my head. that's a big part of why i'm interested in agent orchestration. faster code generation gives me more things to switch between, as well as more things waiting for a build.

i've been looking at things like [T3 Code](https://github.com/pingdotgg/t3code), and it doesn't quite suit what i want yet. a lot of the conversation seems to be about handling different agents and models. i'm mostly interested in keeping track of several projects at once.

i'm working on an agent orchestrator at the moment, and minimising my own cognitive overhead is one of the things i really want to get right.

i might have two agents working in parallel on something, then go and do something on another project, then leave one of those conversations for a day. when i come back, there can be an enormous amount of context in the chat and very little of it left in my head.

i don't want to be the one remembering how the jira ticket relates to the agent conversation, which pr contains the work, which branch it's on and which worktree the agent is using. then there's what the agent knows, what i know, and whatever i was in the middle of thinking when i last looked. keeping the links between all of that in my head is quite a lot of work in itself.

an agent can keep track of those relationships. if it creates a branch or opens a pr, it can attach that to the piece of work. when i switch projects, i'd like the orchestrator to bring that context back together for me. i shouldn't need to go through five different places to reconstruct what we were doing.

we spend a lot of time worrying about the model's context window, but mine is also fairly limited. the agent might still have the conversation available. i've been to sleep and thought about four other projects since then.

decision logs are something i particularly want to formalise in the agent view. what did we decide, why, and what were we assuming? did i agree to that plan, or was it something the agent suggested? if we changed our minds later, i'd like to see that too. a chat transcript contains a lot of this, but finding the relevant bit again can be a job in itself.

i want those decisions linked to the work they explain. when i'm looking at a pr, being able to see why we took that approach would save me having to reconstruct the conversation that led to it. it would also help me give another agent the context it needs without explaining the whole thing again.

so when a build finishes, or i come back to a project tomorrow, i want to see where the work is, what changed, what we've already decided and what needs my attention. enough to get my head back into it and make the next decision. the orchestrator can do the bookkeeping in between.
