from django.urls import path
from .views import RouteCalculatorView

urlpatterns = [
    path('calculate-route/', RouteCalculatorView.as_view(), name='calculate-route'),
]
