import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import mainRouter from "./routes/index";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/tlearn", mainRouter);

//Example route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "tLearn Backend is running!", version: "1.0.0" });
});

// listen to the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
