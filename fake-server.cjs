const http = require("node:http");

const port = 8080;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(port, () => {
  console.log(`Fake server listening on port ${port}`);
});
