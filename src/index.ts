
import app from "./app"
import { env } from "process";
import config from "./config";
import { initDB } from "./db";



const main = async()=>{
    initDB()
    app.listen(config.port,()=>{
        console.log(`My Server is running ${config.port}`);
    })
}


main()