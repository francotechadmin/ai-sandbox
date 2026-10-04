# Tool wear failure: diagnosis

Failure code TWF. In the equipment data a tool fails when `tool_wear_min` reaches roughly 200 to 240 minutes, or is replaced at that point.

## Confirm
1. Read `tool_wear_min` for the machine. Above 200 min is in the failure zone; above 240 min is overdue.
2. Check whether torque has risen over the last shifts at the same speed. Rising torque on a steady load points to a dull tool.
3. Inspect cutting edges for chipping, built-up edge and flank wear. Record wear land width.
4. Check surface finish and dimensional drift on recent parts.

## Decide
- Under 200 min and no damage: continue, schedule replacement.
- 200 to 240 min or visible wear: replace at the next safe stop.
- Over 240 min or chipped edge: stop the machine and replace now.
