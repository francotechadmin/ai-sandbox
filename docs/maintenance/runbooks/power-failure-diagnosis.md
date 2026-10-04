# Power failure: diagnosis

Failure code PWF. In the equipment data it occurs when mechanical power, torque in Nm times rotational speed in rad/s, falls below about 3500 W or rises above about 9000 W.

Power in W = `torque_nm` x `rotational_speed_rpm` x 2 x pi / 60. Use the calculator for this.

## Confirm
1. Compute power from the latest torque and speed readings.
2. Under 3500 W: the machine is running unloaded or the drive is slipping. Check belts, couplings and the motor drive.
3. Over 9000 W: the machine is overloaded. Check feed rate, depth of cut and tool condition.
4. Check supply voltage and current balance across phases.

## Decide
- 3500 to 9000 W: normal operating band.
- Within 10 percent of either limit: warning.
- Outside the band: alarm.
