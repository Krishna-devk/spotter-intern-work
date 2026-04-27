from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RouteRequestSerializer
from .services import geocode_location, fetch_route_data, calculate_hos_logs


class RouteCalculatorView(APIView):
    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            # 1. Geocode all three locations
            current_coords  = geocode_location(data['current_location'])
            pickup_coords   = geocode_location(data['pickup_location'])
            dropoff_coords  = geocode_location(data['dropoff_location'])

            # 2. Fetch 3-waypoint route: current → pickup → dropoff
            route_data = fetch_route_data(current_coords, pickup_coords, dropoff_coords)

            # 3. Calculate HOS schedule with route geometry for map positions
            hos_events = calculate_hos_logs(
                total_drive_minutes  = route_data['total_duration_minutes'],
                total_distance_miles = route_data['total_distance_miles'],
                current_cycle_used   = data['current_cycle_used'],
                geometry             = route_data['geometry'],
                leg0_duration_minutes= route_data['leg0_duration_minutes'],
                unit                 = data['unit'],
            )

            return Response({
                'total_distance_miles':   route_data['total_distance_miles'],
                'total_duration_minutes': route_data['total_duration_minutes'],
                'geometry':               route_data['geometry'],
                'hos_events':             hos_events,
                'geocoded': {
                    'current':  current_coords,
                    'pickup':   pickup_coords,
                    'dropoff':  dropoff_coords,
                },
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
