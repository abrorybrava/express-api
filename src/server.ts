import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import apiRouter from "./routes/api";

const app = express();
const port = 2700;

// Middleware
app.use(bodyParser.json());
app.use(
  cors({
      origin: "http://localhost:3000", // URL frontend
      credentials: true, // Izinkan cookies
  })
);

// Rputer
app.use("/", apiRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something went wrong!" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;