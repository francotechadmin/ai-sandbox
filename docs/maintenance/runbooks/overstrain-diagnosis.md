# Overstrain failure: diagnosis

Failure code OSF. In the equipment data it occurs when the product of tool wear and torque (`tool_wear_min` x `torque_nm`) exceeds a limit that depends on the machine quality type: about 11,000 minNm for L, 12,000 for M and 13,000 for H.

## Confirm
1. Identify the machine type (L, M or H) from `type`.
2. Multiply tool wear by torque with the calculator and compare with the limit for that type.
3. Inspect the spindle, tool holder and workpiece clamping for deflection or damage.
4. Check for chatter marks on parts.

## Decide
- Under 85 percent of the limit: normal.
- 85 to 100 percent: warning, reduce load or replace the tool.
- Over the limit: stop. The tool is worn and heavily loaded at the same time.
