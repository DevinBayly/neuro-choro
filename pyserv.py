from http.server import HTTPServer, SimpleHTTPRequestHandler

from io import BytesIO


class TestingRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        super().do_GET()
    def do_POST(self):
        print("--- headers \n{} ---".format(self.headers))
        print("whole self --\n{}--".format(self))
        content_length = int(self.headers['Content-Length'])
        print(self.rfile,"is rfile")
        body = self.rfile.read(content_length)
        print("body is ",body)
        self.send_response(200)
        self.end_headers()
        response = BytesIO()
        response.write(body)
        self.wfile.write(response.getvalue())


httpd = HTTPServer(('localhost', 8080), TestingRequestHandler)
httpd.serve_forever()
