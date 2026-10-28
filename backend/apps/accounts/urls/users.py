from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("", views.UserListView.as_view(), name="user-list"),
    path("<str:username>/", views.PublicProfileView.as_view(), name="user-profile"),
]
