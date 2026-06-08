import  config  from "../config";
import type { NextFunction, Request, Response } from "express";

 
export const globalErrosHandlader = (err: unknown,req: Request, res: Response, next: NextFunction) =>{

    res.status(500).json({
        success:false,
        message: err instanceof Error ? err.message : "internal Server Erros",
        stack: config.node_env === "development" && err instanceof Error ? err.stack : undefined
    })
    
}