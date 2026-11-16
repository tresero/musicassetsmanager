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

You run your own label, and the distributor's statement, the old CD sales, and
the album download all need to land on the right recording or release.

You've moved distributors and a track now has two ISRCs, or you registered an
album as one work and don't want to type that number on every track.

You spend money on sessions, mixing, and artwork, and you'd like each cost
attached to the song, recording, or release it was for.

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

One install serves several accounts, each seeing only its own catalog,
enforced by row security in the database rather than by the screens. So a
small publisher can have staff, or one install can serve several writers.

An account's owner invites their own people by email and gives each a role:
what they may add, edit, or delete, whether they can change settings, manage
users, or see the money. Accounts are created by invitation only for now.

Self-hosting is the assumption. You need a server, a PostgreSQL install, and
enough comfort to run a few commands. Whether there's ever a hosted version
depends on whether anyone wants one.

## Royalties and project accounting

Partly built. Statements from any payer import from their own files, kept
exactly as received, and match to songs on the publishing side or to
recordings and releases on the master side. Income and expenses are entered by
hand, with receipts, against songs, recordings, and releases, and recoupable
costs are marked against whoever they're recouped from. Profit and loss
reports are next.

The goal is reporting rather than bookkeeping: which songs earn, which
recordings earn, what a given project cost against what it brought in. Import
statements from the MLC, PROs, and distributors, match them to works and
recordings, and answer questions you currently answer by opening four
spreadsheets.

This is not general ledger accounting. It won't file your taxes, track
expenses that aren't about the catalog, or replace whatever your accountant
uses. It's the music-specific half: money in and out, attached to the thing
that earned it or cost it.

Matching leans on what the catalog already holds: ISWCs, ISRCs (a reissue's
too), barcodes, and the payer's own work numbers, so once a line is matched,
later lines from that payer with the same work number or ISRC match on their
own.

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

## Revision history

| Date | Revision |
|---|---|
| 2026-11-15 | Royalties and project accounting partly built. |
| 2026-11-15 | Labels and releases; accounts, invites, and roles are built; statements and transactions as they stand. |
