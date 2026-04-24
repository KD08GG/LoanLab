from django.urls import path, include
from rest_framework.routers import DefaultRouter

from inventario.views import (
    ping,
    RolViewSet,
    UsuarioViewSet,
    EquipoViewSet,
    EstadoEquipoViewSet,
    UbicacionViewSet,
    CategoriaViewSet,
    SolicitudViewSet,
    PrestamoViewSet
)

from inventario.views.equipo_stream_view import equipos_stream
from inventario.views.usuario_stream_view import usuarios_stream
from inventario.views.solicitud_stream_view import solicitudes_stream
from inventario.views.prestamo_stream_view import prestamos_stream



router = DefaultRouter()
router.register(r"roles", RolViewSet)
router.register(r"usuarios", UsuarioViewSet)
router.register(r"equipos", EquipoViewSet)
router.register(r"estados-equipo", EstadoEquipoViewSet)
router.register(r"ubicacion", UbicacionViewSet)
router.register(r"categorias", CategoriaViewSet)
router.register(r"solicitud", SolicitudViewSet)
router.register(r"prestamos", PrestamoViewSet)


urlpatterns = [
    path("ping/", ping, name="ping"),

    path("equipos/stream/", equipos_stream), path("usuarios/stream/", usuarios_stream), path("solicitudes/stream/", solicitudes_stream),path("prestamos/stream/", prestamos_stream),

    # API CRUD
    path("", include(router.urls)),
]