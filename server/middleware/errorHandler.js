function notFound(req, res) {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Invalid data.", details: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong. Please try again." : err.message,
  });
}

module.exports = { notFound, errorHandler };
