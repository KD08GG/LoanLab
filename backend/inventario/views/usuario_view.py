from django.utils import timezone
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from inventario.models import Usuario
from inventario.serializers import UsuarioSerializer
from inventario.sse import send_sse_event


class UsuarioViewSet(ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def perform_create(self, serializer):
        usuario = serializer.save()
        send_sse_event('usuarios', f"usuario_creado:{usuario.pk}")

    def perform_update(self, serializer):
        usuario = serializer.save()
        send_sse_event('usuarios', f"usuario_actualizado:{usuario.pk}")

    def perform_destroy(self, instance):
        usuario_id = instance.pk
        instance.delete()
        send_sse_event('usuarios', f"usuario_eliminado:{usuario_id}")

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        try:
            id_usuario = int(request.data.get('id_usuario'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'id_usuario inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        password = str(request.data.get('password', '')).strip()

        if not password:
            return Response(
                {'error': 'id_usuario y password son obligatorios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not check_password(password, usuario.password):
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            'mensaje': 'Login correcto',
            'usuario': {
                'id_usuario': usuario.id_usuario,
                'nombre_usuario': usuario.nombre_usuario,
                'correo': usuario.correo,
                'id_rol': usuario.id_rol.id_rol,
                'inLab': usuario.inLab,
                'programa': usuario.programa,
                'estado_usuario': usuario.estado_usuario,
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='scan')
    def scan(self, request):
        id_usuario = request.data.get('id_usuario')
        accion = request.data.get('accion')

        if not id_usuario or not accion:
            return Response(
                {'error': 'id_usuario y accion son obligatorios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        usuario.ultimo_acceso = timezone.now()

        if accion == 'entrada':
            usuario.inLab = True
            usuario.estado_usuario = Usuario.EstadoUsuario.ACTIVO
        elif accion == 'salida':
            usuario.inLab = False
            usuario.estado_usuario = Usuario.EstadoUsuario.FUERA
        else:
            return Response(
                {'error': 'Accion invalida. Usa entrada o salida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.save()
        send_sse_event('usuarios', f"usuario_actualizado:{usuario.pk}")

        return Response({
            'mensaje': 'Acceso registrado correctamente',
            'id_usuario': usuario.id_usuario,
            'nombre_usuario': usuario.nombre_usuario,
            'estado_usuario': usuario.estado_usuario,
            'inLab': usuario.inLab,
            'ultimo_acceso': usuario.ultimo_acceso,
        }, status=status.HTTP_200_OK)