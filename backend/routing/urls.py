from django.urls import path
from .views import RouteCalculatorView, AutocompleteView

urlpatterns = [
    path('calculate-route/', RouteCalculatorView.as_view(), name='calculate-route'),
    path('autocomplete/', AutocompleteView.as_view(), name='autocomplete'),
]
