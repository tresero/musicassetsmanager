# Why I use AI on this project

I have been a database engineer for over thirty years. I know what third normal
form costs and when to break it. I know why a disjunctive foreign key is a trap.
What I don't have is patience for the grunt work.

## What AI is  good for

Writing the same trigger for the eighth time. Every parent table in this schema
needs an INSTEAD OF handler that unpacks a jsonb payload into child rows.
Delete what's gone, update what's there, insert what's new. I designed that
pattern once. Typing it out for contacts, then songs, then recordings, with
every column name spelled correctly, is work I don't want to do by hand.

Remembering which of the eighteen React Admin props I need this time.

Turning "the credits table is wrong, one person should hold several roles" into
the migration, the view, the trigger, and the form in one pass.

Catching the places where I contradicted myself two hours ago.

## What AI  is bad at

Deciding anything. It will happily build whatever you describe, including the
wrong thing, and it will build the wrong thing very thoroughly.

Over the course of this project it proposed storing phone numbers in E.164, a
category column on moods, a `credit_name` field on contacts, a per-work PRO
history table, and a supertype hierarchy for parties. Every one of those was
defensible in isolation. Every one was wrong for a catalog this size run by one
person or a small label. It doesn't know when to stop, so you have to.

It also forgets. It'll hand you SQL that references a table you never created,
or reuse a column you dropped four messages ago. If you can't read the output
and know it's wrong before you run it, you're not going to have a good time.

## The actual division of labor

I decide the model. Roles go on the attachment, not the person. Three identity
tables. Natural keys where a standard exists. Splits that don't force-balance.
Those came out of thirty years of watching schemas rot, and a working knowledge
of how publishing actually operates.

The model writes it down, correctly, faster than I can type.

It isn't a replacement for knowing the domain. It's a replacement for the hours
spent transcribing what I already decided.

## Why it's in this repo

If you're reading this schema and wondering why every trigger looks identical,
or why the docs have this much detail for a one-person project, that's why.
Writing it down got cheap.

The design is mine. The typing isn't.