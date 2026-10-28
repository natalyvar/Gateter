from rest_framework.pagination import CursorPagination


class NewestFirstCursorPagination(CursorPagination):
    """
    Paginación por cursor ordenada de más reciente a más antiguo.

    Se prefiere sobre la paginación por offset porque es estable cuando entran
    elementos nuevos (no se repiten ni se saltan maullidos al pedir la página
    siguiente) y su coste no crece con el número de página.
    """

    page_size = 20
    max_page_size = 50
    page_size_query_param = "page_size"
    ordering = ("-created_at", "-id")
