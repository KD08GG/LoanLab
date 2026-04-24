from django.http import StreamingHttpResponse
from inventario.sse import add_client, remove_client


def solicitudes_stream(request):
    def event_stream():
        client = add_client('solicitudes')

        try:
            yield "data: conectado\n\n"

            while True:
                message = client.get()
                yield f"data: {message}\n\n"

        except GeneratorExit:
            remove_client('solicitudes', client)
        except Exception:
            remove_client('solicitudes', client)

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response