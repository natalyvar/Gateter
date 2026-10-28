from django.urls import path

from . import views

urlpatterns = [
    path("meows/", views.MeowListCreateView.as_view(), name="meow-list"),
    path("meows/<int:pk>/", views.MeowDetailView.as_view(), name="meow-detail"),
    path("users/<str:username>/meows/", views.UserMeowListView.as_view(), name="user-meows"),
]
