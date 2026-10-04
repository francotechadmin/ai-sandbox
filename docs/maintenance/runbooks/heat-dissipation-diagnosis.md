# Heat dissipation failure: diagnosis

Failure code HDF. In the equipment data it occurs when the difference between process temperature and air temperature (`process_temp_k - air_temp_k`) falls below about 8.6 K while rotational speed is below about 1380 rpm.

## Confirm
1. Compute the temperature difference. A difference under 8.6 K with a speed under 1380 rpm is the failure condition.
2. Check the cooling fan, airflow path and filters for blockage.
3. Check coolant level, flow and temperature.
4. Compare with the ambient temperature at the machine; a hot room makes the margin smaller.

## Decide
- Difference above 9 K: normal.
- Between 8.6 and 9 K at low speed: warning, inspect cooling soon.
- Under 8.6 K at low speed: alarm, raise speed if the process allows or stop and cool.
