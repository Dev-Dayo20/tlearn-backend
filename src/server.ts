import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//Example route
app.get("/", (req: Request, res: Response) => {
  res.send("tLearn Backend is running!");
});

// listen to the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
