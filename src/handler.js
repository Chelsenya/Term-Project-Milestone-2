const { parse } = require("url");
const { DEFAULT_HEADER } = require("./util/util.js");
const controller = require("./controller");
const { createReadStream } = require("fs");
const path = require("path");

const allRoutes = {
  // GET: localhost:3000/
  "/:get": async (request, response) => {
    await controller.getHomePage(request, response);
  },
  // POST: localhost:3000/form
  "/form:post": (request, response) => {
    controller.sendFormData(request, response);
  },
  // POST: localhost:3000/images
  "/images:post": async (request, response) => {
    try {
      await controller.uploadImages(request, response);
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(`<h1>Image Uploaded Successfully</h1>`);
    } catch (err) {
      response.writeHead(500, {'Content-Type': 'text/html'});
      response.end(err.message);
    }
    
  },
  // GET: localhost:3000/feed
  // Shows instagram profile for a given user
  "/feed:get": (request, response) => {
    controller.getFeed(request, response);
  },

  // 404 routes
  default: (request, response) => {
    response.writeHead(404, DEFAULT_HEADER);
    createReadStream(path.join(__dirname, "views", "404.html"), "utf8").pipe(
      response
    );
  },
};

function handler(request, response) {
  const { url, method } = request;
  const { pathname } = parse(url, true);
  const filePath = path.join(__dirname, "..", pathname);

  if (pathname.startsWith("/src/photos/")) {
    if (!filePath.startsWith(path.join(__dirname, "..", "src/photos/"))) {
      response.writeHead(403);
      response.end("Access Denied");
      return;
    }

    const readStream = createReadStream(filePath);
    readStream.on("open", () => {
      const extension = path.extname(filePath);
      const contentType =
        extension === ".png"
          ? "image/png"
          : (extension === ".jpeg" || extension === ".jpg"
          ? "image/jpeg"
          : "application/octet-stream");
      response.writeHead(200, { "Content-Type": contentType });
      readStream.pipe(response);
    });

    readStream.on("error", (err) => {
      if (err.code === "ENOENT") {
        response.writeHead(404, DEFAULT_HEADER);
        response.end("Not Found");
      } else {
        console.error(err);
        response.writeHead(500);
        response.end("Internal Server Error");
      }
    });

  } else {
    const key = `${pathname}:${method.toLowerCase()}`;
    const chosen = allRoutes[key] || allRoutes.default;

    return Promise.resolve(chosen(request, response)).catch(
      handlerError(response)
    );
  }
}

function handlerError(response) {
  return (error) => {
    console.log("Something bad has  happened**", error.stack);
    response.writeHead(500, DEFAULT_HEADER);
    response.write(
      JSON.stringify({
        error: "internet server error!!",
      })
    );

    return response.end();
  };
}

module.exports = handler;