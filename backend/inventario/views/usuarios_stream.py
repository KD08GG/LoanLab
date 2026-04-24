from django.http import StreamingHttpResponse
from inventario.sse import add_client, remove_client

def usuarios_stream(request):
    def event_stream():
        client = add_client()

        try:
            yield "data: conectado\n\n"

            while True:
                message = client.get()
                yield f"data: {message}\n\n"

        except GeneratorExit:
            remove_client(client)

    return StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )