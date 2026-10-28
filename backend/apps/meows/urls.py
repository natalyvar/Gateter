from django.urls import path

from . import views

urlpatterns = [
    path("meows/", views.MeowCreateView.as_view(), name="meow-create"),
    path("users/<str:username>/meows/", views.UserMeowListView.as_view(), name="user-meows"),
]
