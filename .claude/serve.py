import functools
import http.server

Handler = functools.partial(
    http.server.SimpleHTTPRequestHandler,
    directory="/Users/oliviasuter/Desktop/olivia-site",
)
http.server.test(HandlerClass=Handler, port=8420, bind="127.0.0.1")
