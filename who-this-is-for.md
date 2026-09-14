# Who this is for

Indie songwriters, small publishers, and one-person labels. People with a real
catalog and real obligations, but no rights department.

If you write, publish your own work, maybe administer a few other writers, and
currently track all of it in a spreadsheet that you're afraid to touch, this is
built for you.

## You'll get value from it if

You have more than about twenty works and you've lost track of at least one
split.

You've ever answered "can you clear this" with "let me check" and then spent an
hour checking.

You register with a PRO and the MLC and you want to know which works are
missing from which.

You have co-writers, and their shares and societies matter when something gets
placed.

You pitch for sync and the supervisor wants a one-stop, so you need to know
whether you actually control the whole thing.

You've worked with the same bass player on nine sessions and you'd like the
credits to say so without retyping his name nine times.

You get statements from three or four sources and you'd like to know which
songs actually earn.

You're the only person who understands where anything is, and that bothers you.

## What "indie" means here

This scales from one writer with thirty songs to a small publisher with a few
thousand works and a handful of administered writers.

The design choices reflect that. Phone numbers are stored in a way that would
be wrong at a company with a contact database of fifty thousand records, and
right for one with four hundred. Splits are flagged rather than enforced,
because the person entering them is usually the same person chasing the missing
information. Data entry speed beats theoretical purity, consistently, because
the alternative is data that never gets entered.

## Multi-user and hosting

Every owned table carries an account id, and the row-level security scaffolding
is in place. The model supports several accounts in one database, each seeing
only its own catalog, so a small publisher can have staff, or one install can
serve several writers.

The policies themselves aren't written yet. There's one user so far, and
writing security policies against a case that doesn't exist is how you get
policies that don't work.

Self-hosting is the assumption. You need a server, a PostgreSQL install, and
enough comfort to run a few commands. Whether there's ever a hosted version
depends on whether anyone wants one.

## Royalties and project accounting

Planned, not built.

The goal is reporting rather than bookkeeping: which songs earn, which
recordings earn, what a given project cost against what it brought in. Import
statements from the MLC, PROs, and distributors, match them to works and
recordings, and answer questions you currently answer by opening four
spreadsheets.

This is not general ledger accounting. It won't file your taxes, track your
expenses beyond a project, or replace whatever your accountant uses. It's the
music-specific half: money in, attached to the thing that earned it.

The schema is already shaped for it. Works, recordings, and releases have
stable identifiers, splits are recorded per party, and society registrations
carry the work numbers that statements key on. That's most of what statement
matching needs.

## It's not for

**Majors.** UMG, Sony, Warner, and the big independents have rights systems
that cost more per year than this project will ever be worth. They have claim
resolution, conflict management, statement processing at scale, and teams to
run it. Their needs are real. This isn't aimed at them.

**Anyone who wants to avoid learning the domain.** The software will let you
record a split that doesn't total 100%, because sometimes you don't know the
last 25% yet. It assumes you know what a split sheet is and why it matters. It
will not teach you publishing.

If you're running a rights department, you'll want something else. If you're
running your own catalog out of your own head, this is an attempt to get it out
of your head and into something that can answer questions.