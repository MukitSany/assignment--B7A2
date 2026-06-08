import express, { type Application, type Request, type Response } from "express"
import { logger } from "./middleware/logger";
import { globalErrosHandlader } from "./middleware/globalErrosHandlader";
import authRoutes from "./api/routes/auth.routes"
import issueRoutes from "./api/routes/order.routes";
import cokieParser from "cookie-parser"

const app :Application = express();

app.use(logger)
app.use(cokieParser())
app.use(express.json())

app.get("/", (req: Request, res: Response) => {
    // console.log("response connected");
    // throw new Error("Server is not Working")
    res.send("Hi this is Mukit")
})


app.use("/api/auth",authRoutes);
app.use("/api",issueRoutes);

app.use(globalErrosHandlader)
export default app