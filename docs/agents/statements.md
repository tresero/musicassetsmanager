# Statements and money

Reference for changing royalty statements, statement lines, transactions or
anything under money. The user-facing behavior is in `docs/features.md`
(Statements, Transactions) and `docs/faq.md`; the matching order and each
object's details are in the `COMMENT ON` text in `db/schema.sql`. This file
holds the rules those do not state.

## Model

- `music.statement` is one imported file from any payer: a society, the MLC,
  a publisher, a label, a distributor. `music.statement_line` is one row of
  it, kept in jsonb `data` exactly as in the file (keyed by header, values as
  text). No table per payer and no mapping table: `statement.mapping` records
  which headers fed each field, and the next import from the same payer and
  recipient starts from it. A new payer or column needs no migration.
- A statement has one `statement_date`, and income is reported by it. Usage
  periods belong to the lines, since one distribution pays for many months.
- A statement names who it pays: `recipient_contact_id` or
  `recipient_organization_id`, exactly one (Paid to).
- Each statement has a `side`. `publishing` lines match songs; `master` lines
  match a recording or a whole release. A line has at most one of song,
  recording, release, and the `statement_line_side` trigger refuses the wrong
  side.

## The audit copy

- `data`, `amount`, `work_ref`, `isrc`, `upc` and the usage period never
  change after import. A user changes only what a line is matched to and
  `match_method`. To read a file differently, delete the statement and import
  it again.
- Rows are never deduplicated: identical rows from one payer are legitimate
  (the same plays at the same rate in another period), and no payer has a
  reliable row ID. Only the same file twice is refused, by its hash.
  Corrections arrive as adjustment lines in later statements.

## Matching

- `music.match_statement` runs at import and on Rematch; its `COMMENT ON`
  gives the order for each side. Close titles are suggested in the Match
  dialog (`api.song_suggestions`, `api.recording_suggestions`), never matched
  automatically.
- A hand match teaches later lines: by `work_ref`, and on the master side by
  ISRC, which a hand match also writes onto the recording or into its other
  ISRCs (`music.recording_isrc`; `music.isrc_once` keeps an ISRC on one
  recording).
- `match_method IS NULL` is unmatched. `not_in_catalog` is real income on
  nothing in the catalog (BMI cable retransmission, NCTA), with nothing
  matched; it stays in the totals.

## Money

- Reporting, not banking: no payments or deposits are recorded, and every
  statement is assumed deposited.
- The account reports in `account.currency_code`, which locks once a
  statement or transaction exists. A statement in another currency carries its
  payout in the account currency; lines convert at payout over statement
  total.
- Transactions are hand-entered income and expenses. `account_amount` is the
  amount in the account currency (`music.transaction_amount` copies it when
  the currencies match). Splits (`transaction_split`) name exactly one of
  song, recording, release with a weight; share is weight over the total,
  computed, never stored. No splits means overhead.
- Publishing and master are accounted apart; cross-collateralizing them is not
  modeled.
- Reading needs `money.view` (in the row policies), writing `money.edit`. A
  song, recording or release with matched lines or transactions cannot be
  deleted (`music.song_in_use`, `music.in_statements`,
  `music.in_transactions`).

## Performance

`api.statement_line` serves the Unmatched lines list, a single line, and a
statement's lines. Keep every filter able to reach `music.statement_line`: a
window function in the view (as the statement total once was) makes Postgres
read, sort and unpack every line in the account on each request. Per-statement
values go in a correlated subquery, run only when needed. If lines turn slow
right after a large import, check the planner statistics first.

## Revision History

| Date | Revision |
|---|---|
| 2026-11-15 | Moved out of `AGENTS.md`; performance note added. |
