import os
import math
import requests


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def geocode_location(location_str):
    """Convert address string OR 'lng,lat' pair to [lng, lat]."""
    parts = [p.strip() for p in location_str.split(',')]
    if len(parts) == 2:
        try:
            a, b = float(parts[0]), float(parts[1])
            return [a, b]
        except ValueError:
            pass

    api_key = os.getenv('ORS_API_KEY')
    if not api_key:
        raise ValueError("ORS_API_KEY not set.")

    resp = requests.get(
        "https://api.openrouteservice.org/geocode/search",
        params={'api_key': api_key, 'text': location_str, 'size': 1},
        timeout=10,
    )
    resp.raise_for_status()
    features = resp.json().get('features', [])
    if not features:
        raise ValueError(f"Could not geocode: '{location_str}'. Try a more specific address.")
    return features[0]['geometry']['coordinates']  # [lng, lat]


# ---------------------------------------------------------------------------
# Route geometry helpers
# ---------------------------------------------------------------------------

def _haversine_m(p1, p2):
    """Metres between two [lng, lat] points."""
    lat1, lon1 = math.radians(p1[1]), math.radians(p1[0])
    lat2, lon2 = math.radians(p2[1]), math.radians(p2[0])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * math.asin(math.sqrt(a)) * 6_371_000


def interpolate_position(geometry, fraction):
    """Return [lng, lat] at `fraction` (0-1) along route geometry."""
    if not geometry:
        return [0, 0]
    fraction = max(0.0, min(1.0, fraction))
    cum = [0.0]
    for i in range(1, len(geometry)):
        cum.append(cum[-1] + _haversine_m(geometry[i - 1], geometry[i]))
    total = cum[-1]
    if total == 0:
        return geometry[0]
    target = fraction * total
    for i in range(1, len(cum)):
        if cum[i] >= target:
            t = (target - cum[i - 1]) / (cum[i] - cum[i - 1]) if cum[i] != cum[i - 1] else 0
            lng = geometry[i - 1][0] + t * (geometry[i][0] - geometry[i - 1][0])
            lat = geometry[i - 1][1] + t * (geometry[i][1] - geometry[i - 1][1])
            return [lng, lat]
    return geometry[-1]


# ---------------------------------------------------------------------------
# Route fetching  (current → pickup → dropoff)
# ---------------------------------------------------------------------------

def fetch_route_data(current_coords, pickup_coords, dropoff_coords):
    api_key = os.getenv('ORS_API_KEY')
    if not api_key:
        raise ValueError("ORS_API_KEY not set.")

    resp = requests.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        headers={'Authorization': api_key, 'Content-Type': 'application/json'},
        json={'coordinates': [current_coords, pickup_coords, dropoff_coords], 'instructions': True},
        timeout=30,
    )
    resp.raise_for_status()
    route = resp.json()['features'][0]
    props = route['properties']
    segs  = props.get('segments', [])

    if not segs:
        # Fallback if segments still missing for some reason
        total_distance_miles   = props['summary']['distance'] * 0.000621371
        total_duration_minutes = props['summary']['duration'] / 60
        leg0_distance_miles    = 0
        leg0_duration_minutes  = 0
    else:
        total_distance_miles   = sum(s['distance'] for s in segs) * 0.000621371
        total_duration_minutes = sum(s['duration'] for s in segs) / 60
        leg0_distance_miles    = segs[0]['distance'] * 0.000621371
        leg0_duration_minutes  = segs[0]['duration'] / 60

    geometry = route['geometry']['coordinates']  # [[lng, lat], …]

    return {
        'total_distance_miles':   total_distance_miles,
        'total_duration_minutes': total_duration_minutes,
        'geometry':               geometry,
        'leg0_distance_miles':    leg0_distance_miles,
        'leg0_duration_minutes':  leg0_duration_minutes,
    }


# ---------------------------------------------------------------------------
# HOS log calculator
# ---------------------------------------------------------------------------

def calculate_hos_logs(total_drive_minutes, total_distance_miles, current_cycle_used, geometry,
                       leg0_duration_minutes=0, unit='miles'):
    """
    FMCSA-compliant HOS schedule.
    Assumptions: property-carrying, 70 hr / 8-day, no adverse conditions.
    Returns a list of events, each with lat/lng for map rendering.
    """
    DRIVE_LIMIT     = 11 * 60   # minutes
    DUTY_WINDOW     = 14 * 60
    BREAK_THRESH    = 8  * 60   # cumulative driving before mandatory 30-min break
    BREAK_DUR       = 30
    RESET_DUR       = 10 * 60
    CYCLE_LIMIT     = 70 * 60
    RESTART_DUR     = 34 * 60
    FUEL_THRESHOLD  = 1000 if unit == 'miles' else 1609.34
    FUEL_DUR        = 15
    STOP_DUR        = 60        # pickup / dropoff

    if total_drive_minutes <= 0:
        total_drive_minutes = 1
    avg_speed_mpm = total_distance_miles / total_drive_minutes  # miles per minute

    events          = []
    current_time    = 0
    daily_drive     = 0
    daily_duty      = 0
    cont_drive      = 0
    cycle_used      = current_cycle_used * 60
    miles_fuel      = 0
    cum_drive       = 0         # cumulative driving minutes (for route fraction)

    # The driving portion starts after pickup stop and the dead-head leg to pickup.
    # We model position as fraction of DRIVING time only.
    drive_total = total_drive_minutes  # total minutes of pure driving

    def drive_frac():
        return cum_drive / drive_total if drive_total > 0 else 0

    def pos(f=None):
        f = drive_frac() if f is None else f
        p = interpolate_position(geometry, f)
        return {'lng': p[0], 'lat': p[1]}

    def add(status, duration, description, frac_override=None):
        nonlocal current_time
        p = pos(frac_override)
        events.append({
            'status':      status,
            'start_time':  current_time,
            'end_time':    current_time + duration,
            'duration':    duration,
            'description': description,
            'lng':         p['lng'],
            'lat':         p['lat'],
        })
        current_time += duration

    # --- Dead-head to pickup (on duty, not driving) then pickup stop ---
    if leg0_duration_minutes > 0:
        add('On Duty (Not Driving)', leg0_duration_minutes, 'Driving to Pickup Location', frac_override=0.0)
        daily_duty += leg0_duration_minutes
        cycle_used += leg0_duration_minutes

    add('On Duty (Not Driving)', STOP_DUR, 'Pickup', frac_override=0.0)
    daily_duty += STOP_DUR
    cycle_used += STOP_DUR

    remaining = total_drive_minutes

    while remaining > 0:

        # --- Check limits before driving ---
        if cycle_used >= CYCLE_LIMIT:
            add('Off Duty', RESTART_DUR, '34-Hour Restart')
            daily_drive = daily_duty = cont_drive = 0
            cycle_used = 0
            continue

        if daily_drive >= DRIVE_LIMIT or daily_duty >= DUTY_WINDOW:
            add('Off Duty', RESET_DUR, '10-Hour Reset')
            daily_drive = daily_duty = cont_drive = 0
            continue

        if cont_drive >= BREAK_THRESH:
            add('Off Duty', BREAK_DUR, '30-Minute Break')
            cont_drive = 0
            continue

        # --- Compute drive chunk ---
        can_11h    = DRIVE_LIMIT   - daily_drive
        can_14h    = DUTY_WINDOW   - daily_duty
        can_break  = BREAK_THRESH  - cont_drive
        can_cycle  = CYCLE_LIMIT   - cycle_used
        miles_left = FUEL_THRESHOLD - miles_fuel
        time_fuel  = miles_left / avg_speed_mpm if avg_speed_mpm > 0 else float('inf')

        chunk = min(remaining, can_11h, can_14h, can_break, can_cycle, time_fuel)

        if chunk <= 0:
            # Safety valve — take a reset to avoid infinite loop
            add('Off Duty', RESET_DUR, '10-Hour Reset')
            daily_drive = daily_duty = cont_drive = 0
            continue

        add('Driving', chunk, 'Driving')
        remaining   -= chunk
        daily_drive += chunk
        daily_duty  += chunk
        cont_drive  += chunk
        cycle_used  += chunk
        miles_fuel  += chunk * avg_speed_mpm
        cum_drive   += chunk

        if remaining <= 0:
            break

        # --- What caused the stop? ---
        if cycle_used >= CYCLE_LIMIT:
            add('Off Duty', RESTART_DUR, '34-Hour Restart')
            daily_drive = daily_duty = cont_drive = 0
            cycle_used = 0

        elif daily_drive >= DRIVE_LIMIT or daily_duty >= DUTY_WINDOW:
            add('Off Duty', RESET_DUR, '10-Hour Reset')
            daily_drive = daily_duty = cont_drive = 0

        elif cont_drive >= BREAK_THRESH:
            add('Off Duty', BREAK_DUR, '30-Minute Break')
            cont_drive = 0
        
        elif miles_fuel >= FUEL_THRESHOLD:
            add('On Duty (Not Driving)', FUEL_DUR, 'Fuel Stop')
            miles_fuel  = 0
            daily_duty += FUEL_DUR
            cycle_used += FUEL_DUR
            cont_drive  = 0   # fueling interrupts continuous driving

    # --- Drop-off ---
    add('On Duty (Not Driving)', STOP_DUR, 'Drop-off', frac_override=1.0)

    return events
