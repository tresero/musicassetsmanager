# Frequently asked questions

Answers for people using the app, written so each one can also be shown in a
short video. Each answer ends with the steps to show on screen.

## Statements

### Some statement lines are not for anything in the catalog. What do I do with them?

Mark them **Not in catalog**. Payers include income that is not earned by one
work: BMI's cable retransmission and NCTA annual payments, unreported works,
additional revenue. They are real income and stay in the statement's total,
but no song should get the credit.

A line marked Not in catalog leaves the unmatched list and shows "Not in
catalog" in the Matched to column. Marking one line also marks the payer's other
unmatched lines for the same work: the same work number, or, when the line has
none, the same ISRC on a master statement, or the same title. Later statements from that payer mark those lines on their own, so
"NCTA - ANNUAL" from BMI only has to be marked once.

In reports, this income belongs to the catalog as a whole rather than to a
song or recording, the same as overhead.

If a line was marked by mistake, open it and choose **Not in catalog: back to
unmatched**, then match it.

To show it:

1. Open **Money > Statement lines**, which lists the unmatched lines.
2. Click **Match** on a line such as NCTA - ANNUAL.
3. Click **Not in catalog**. The message says which other lines were marked too.
4. Open the statement: its total is unchanged, and **Not in catalog** counts
   the marked lines.
5. Open a marked line and click **Not in catalog: back to unmatched** to undo it.

### Why do lines with work number 0 not match each other?

BMI gives work number 0 to lines that are not one work, such as cable
retransmission. A work number made only of zeros is treated as no work number,
so matching one of those lines never matches the others. Lines without a work
number are matched by title instead, and marked Not in catalog by title.

To show it: open a BMI line with TITLE # 0. Its work number is blank, and the
row as imported, below, still shows 0.

### How do I import a label or distributor statement?

Choose **Master** as the side. Its lines are matched to recordings by ISRC, or
to a release by barcode when a line is on a whole album, rather than to songs.
Map the ISRC, Barcode and Artist columns at the Columns step. A file that ends
with a totals row, as Curve's does, has it left out on its own: **Rows to leave
out at the end** starts at 1 and says why. Check it, since a totals row
imported as a line doubles the statement.

A recording with no ISRC yet gets one the first time a line is matched to it
by hand, so the next statement matches it on its own. A recording that already
has a different ISRC, such as a reissue's original, keeps the line's under
**Other ISRCs** on its Details tab instead.

To show it:

1. **Money > Statements > Import a statement**, choose the payer and
   **Master**, and drop the file.
2. At Columns, check that Amount is the amount payable to you (Curve's Net
   Payable) and that ISRC and Barcode are filled in.
3. Import, open the statement, and click **Match** on an unmatched line.
4. Pick the recording, or choose **Whole release** for an album line.

### How do I import CD Baby sales?

As a **Master** statement. Map Amount to Price and **Quantity** to Quantity,
since CD Baby's price is per unit; Release title is guessed from Album Name, and
Work number can be Album ID. A CD line has no ISRC or song title, so it matches
the release with that album's title, or, when the title is not in the catalog,
is matched once by hand with **Whole release**; later lines with the same Album
ID then match on their own. A return has a minus on both Quantity and Price
(-1 at -3); it imports as -3, and the Check step counts the negative rows.

### Can an expense be for no song?

Yes. A transaction with nothing on its **For** tab is overhead: it belongs to
the catalog as a whole, as Not in catalog income does.

To show it: **Money > Transactions > New transaction**, fill in the details,
leave **For** empty, and save. The list shows Overhead under For.

## Copyright

### I registered an album as one work. Do I enter the number on every track?

No. Put it once, on the release: either type it on the release's
**Copyright** tab, or attach the registration as a document of type
**Copyright Registration** and fill in its **Registration number** (its Date
is the registration date). Every track on the release then shows that number
on its own Copyright tab, read only, with where it comes from, and drops off
**Reports > Unregistered recordings**. A track registered separately gets its
own number with **Give it its own registration**, which then takes over.

The same document can be attached to several songs, recordings or releases,
such as one group registration covering several songs.

To show it:

1. Open a release and go to its **Documents** tab.
2. Upload the registration, or attach it with **Attach an existing document**,
   and set its Type to **Copyright Registration**.
3. Fill in **Registration number** and the **Date** it was registered, then
   click **Save & continue**.
4. Open the release's **Copyright** tab: the number shows, from the document.
5. Open one of its tracks and its **Copyright** tab: the same number shows,
   from the release.
6. Open **Reports > Unregistered recordings**: the release's tracks are gone.

### Why does a Copyright tab warn that the document says a different number?

The record has its own registration number, and none of the Copyright
Registration documents attached to it has that number. Its own number is the
one used. Correct whichever is wrong, or detach a document that belongs to
something else, such as a composition's registration attached to a recording.

To show it:

1. Open the record with the warning and go to its **Copyright** tab.
2. Compare its **Registration number** with the number in the warning.
3. Correct the wrong one: the number here, or the document's **Registration
   number** on the **Documents** tab. Or move a number that belongs to the
   composition to the song's own Copyright tab.
4. Click **Save & continue**: the warning goes.

## Revision History

| Date | Revision |
|---|---|
| 2026-11-14 | Initial version: Not a song lines, work number 0, expenses on no song. |
| 2026-11-15 | Not a song is now Not in catalog; importing master statements; expenses for no song are built. |
| 2026-11-15 | Other ISRCs for reissues. |
| 2026-11-15 | A final totals row is left out on its own. |
| 2026-11-15 | Importing CD Baby sales, returns included. |
| 2026-11-15 | Copyright: album registrations and mismatched numbers. |
