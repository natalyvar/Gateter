from rest_framework.exceptions import NotFound


class UserNotFound(NotFound):
    default_detail = "No encontramos a ningún usuario con ese nombre."
    default_code = "user_not_found"
