import queue

channels = {
    'equipos': [],
    'usuarios': [],
}


def add_client(channel: str):
    q = queue.Queue()
    channels.setdefault(channel, []).append(q)
    return q


def remove_client(channel: str, q):
    if channel in channels and q in channels[channel]:
        channels[channel].remove(q)


def send_sse_event(channel: str, data: str):
    dead_clients = []

    for client in channels.get(channel, []):
        try:
            client.put(data)
        except Exception:
            dead_clients.append(client)

    for client in dead_clients:
        remove_client(channel, client)