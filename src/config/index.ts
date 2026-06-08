import dotenv from "dotenv";
import { env } from "process"

dotenv.config({quiet: true});


const config = {
    port: env.PORT as string,
    database_url : env.DATABASE_URL as string,
    node_env : env.NODE_ENV as string,
    jwt_secret: env.JWT_SECRET as string,
    refress_secret: env.REFRESS_SECRET as string
}

export default config