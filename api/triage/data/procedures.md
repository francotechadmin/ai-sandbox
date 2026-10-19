# Trade Ops Procedures (synthetic, for demo use)

## SOP-01 Break handling: overview
Every break is worked in this order: read the break, pull the trade record, pull market data where price is involved, find the matching SOP, name the cause, draft a fix. Operations drafts; a human approves. Nothing is amended, cancelled or sent to a counterparty without that approval. If the evidence does not support a cause, record what is missing and escalate rather than guess.

## SOP-02 Price breaks
Compare the booked price and the counterparty price to the settlement price for the trade date. A settlement price is a sanity check, not proof: trades execute intraday. If one price is more than 1% from settlement and the other is within 1%, the far price is the likely error (typo, transposed digits, wrong unit). If both are within 1% of settlement, settlement cannot identify the correct price: get the broker recap or the trader's blotter note before proposing any amendment. Never amend to the counterparty price on settlement evidence alone. Check units (USD/MMBtu vs USD/therm, USD/bbl vs USD/gal) before treating a gap as a price error.

## SOP-03 Quantity breaks
Compare booked quantity with the counterparty confirmation and the broker recap. A recap that agrees with the counterparty supports amending the booking; a recap that agrees with the booking supports disputing the confirmation. A quantity gap of 10x or more points to a keying error (extra or missing zero). With no recap, the trader must confirm the size. Quantity breaks above USD 1M notional on either side are Medium or higher in the escalation matrix.

## SOP-04 Escalation matrix
Escalate by the larger notional (quantity x price, either side) of the break: under USD 1M, the analyst resolves and the team lead reviews; USD 1M to 10M, team lead approval is required; over USD 10M, the desk head and Market Risk must both be told before any amendment. Independent of size: any counterparty identity or LEI discrepancy goes to Legal and Credit; any trade missing from the blotter goes to the front-office desk head; a break unresolved after 3 business days goes to the team lead.

## SOP-05 Confirmation matching
Matching fields: counterparty (by LEI), product, contract month, trade date, settlement date, quantity, price and price unit. A break on any one field blocks matching. Check each field in turn and list which fields agree, so that the report shows the break is limited to the fields in dispute. A contract month difference is a trade-economics dispute, not a typo: it needs the broker recap.

## SOP-06 Missing confirmations
If no confirmation has arrived by T+1, chase the counterparty by email and record the time. If none by T+2, call the counterparty's operations desk and tell the team lead. At T+3 the trade is escalated as an unconfirmed trade. Do not assume the trade is wrong: an unconfirmed trade is unverified, not invalid. Draft the chase for approval; do not send it.

## SOP-07 Duplicate bookings
Two internal trades with the same trader, product, quantity, price and date, entered close together, against one counterparty confirmation, are suspected duplicates. Confirm using the counterparty confirmation (it matches one trade only) and the trade timestamps. Propose cancelling the unmatched trade only after the front office confirms it is not a genuine second trade. Cancellations always need team lead approval.

## SOP-08 Trade date and settlement date breaks
Trade dates must be business days. A booked trade date on a weekend or exchange holiday is a booking error unless the counterparty confirms the same date; no settlement price exists for such dates. Compare against the counterparty's date and the last prior business day. A settlement date mismatch is amended to the date in the master agreement or deal ticket, and the counterparty is asked to confirm the date in writing.

## SOP-09 Counterparty and entity breaks
Never re-book a trade to a different legal entity on the strength of a confirmation alone, even where the names are similar. Legal and Credit must confirm which entity the desk dealt with, because credit limits, netting and documentation differ by entity. Hold the trade from settlement until that is resolved.
