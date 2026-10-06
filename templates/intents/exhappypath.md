AI Suggestion Box — Example Test Case
Idea
Title: Reduce Duplicate Customer Issue Investigations
Original suggestion:
Customers often report the same problem to multiple departments because they don't know who owns it. Each department creates its own ticket, sends emails, and investigates separately. Sometimes three or four teams are working on the same customer issue without knowing it.
I'd like a simple way to recognize when a newly reported issue is probably related to an existing problem and direct employees to the team already working on it.
This could reduce duplicate work, shorten response times, and give customers more consistent answers.

Stage 1 — Problem
Initial review note:
Multiple teams appear to be working the same customer issues independently. Recommend validating the frequency and time lost before proposing a solution.

Workbench decision
NOT YET — DOES NOT MEET THE BAR FOR EVIDENCE
Nothing has actually been measured.
Statements such as:
“Sometimes three or four teams are working on the same issue.”

do not count as evidence.
Evidence requested
Review a sample of recent tickets and determine:
- How many are duplicates?
- How many teams are involved?
- How much duplicate effort occurs?
Stage 2 — Evidence
Evidence submitted:
Reviewed 120 customer tickets from the last 30 days. 23 were duplicates involving the same underlying customer issue. Those duplicates involved 2–4 teams and an estimated 41 hours of repeated investigation.

Result
The problem is now measurable:
23 of 120 tickets were duplicates — approximately 19%.
41 staff hours were spent on duplicate investigation during the sample period.
Decision
MOVE TO PROTOTYPE
The measurements show that the problem is significant enough to justify a small experiment.
Stage 3 — Prototype
Prototype hypothesis
Can a newly submitted customer ticket be matched to an existing ticket concerning the same underlying problem?
Prototype
A simple Duplicate Issue Detector.
Example input:
Customer cannot complete checkout. Payment succeeds but the order never appears in order history.

Example output:
Possible duplicate found — 91% similarity
Existing Ticket #4821
Payment processed but order not created
Owner: Commerce Support
Status: Investigating
Recommendation: Route to the existing investigation rather than opening another one.

Prototype results
Tested 50 historical customer tickets. The prototype correctly identified 21 of 24 known duplicate issues (88%) and produced 3 false positives. Estimated duplicate investigation time avoided: 34 hours.

Workbench decision
DO NOT BUILD YET
The prototype worked on historical data, but nobody has demonstrated that it works during actual operations.
There is also an important unresolved question:
Could ordinary customer/account search or clearer ownership solve the problem just as well?

Smallest next move
Run the prototype in shadow mode against live incoming tickets for 2–4 weeks.
Employees see recommendations but are not required to act on them.
Compare the prototype against simple customer/account search.
Stage 4 — Shadow Trial
Results submitted:
Shadow trial completed over 3 weeks on 186 live tickets. The prototype correctly identified 32 of 35 duplicate issues (91%), with 3 false positives. Simple customer/account search caught only 14 of the 35 duplicates. Estimated duplicate investigation time avoided: 47 hours.

Decision
PROCEED TO LIMITED PILOT
The prototype now has evidence from live work and materially outperformed the simpler alternative.
Stage 5 — Pilot
Pilot:
18 employees
3 departments
4 weeks
Results
Duplicate investigations decreased 72%.
63 staff hours were saved during the pilot.
Users accepted 89% of suggested matches.
No significant workflow disruptions were reported.

Business value
Projected annual duplicate work eliminated:
~815 hours
Estimated fully loaded labor cost:
$75/hour
Projected annual savings across the three departments:
~$61,000 per year
Stage 6 — Investment Gate
Evidence package
Original problem
Multiple departments independently investigate the same customer issues.
Baseline evidence
23 duplicate cases among 120 tickets.
Measured baseline waste
41 hours of duplicate investigation.
Prototype
21 of 24 historical duplicates detected.
Shadow trial
32 of 35 live duplicates detected.
Comparison
Simple search detected only 14 of 35.
Pilot
18 employees / 3 departments / 4 weeks.
Measured improvement
72% reduction in duplicate investigations.
Measured pilot savings
63 staff hours.
User acceptance
89%.
Projected annual benefit
Approximately 815 hours / $61,000 across the pilot departments.
Investment decision
ELIGIBLE FOR INVESTMENT REVIEW
The idea has progressed from an employee observation to a measured business case supported by:
Problem → Evidence → Prototype → Live Trial → Pilot → Measured Value
Why this is the perfect example
The important part isn't that the idea eventually passed.
It's that the workbench stopped it several times.
At first:
“You haven't proved there's a problem.”
Then:
“Your prototype worked, but you haven't proved it works in the real world.”
Then:
“Maybe a simpler solution works just as well.”
Only after those questions were answered did it reach investment.
That's exactly what this product is supposed to do:
Ideas don't move forward because somebody likes them. They earn the right to proceed through evidence.

I'd put this exact example behind your “See a filled-in example” link. It teaches the entire product without requiring a manual.