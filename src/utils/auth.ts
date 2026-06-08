import type { NextFunction, Request, Response } from "express";
import { sendResponse } from "./sendResponse";
import { verifyToken } from "./jwt";
import authService from "../api/services/auth.service";
import type { Role } from "../types";


export const auth = async (req: Request, res: Response, next: NextFunction) => {
     try {
        const token = req.headers.authorization
        if(!token){
            return sendResponse(res, {message:"token not found"},401)
        }
    
        const payload = verifyToken(token,"access")
        
        if(!payload){
            return sendResponse(res, {message:"Invalid token"},401)
        }

        const user = await authService.getUserById(String(payload.id))
            if(!user){
                return sendResponse(res, {message:"User not found", error:true},401)
            }

            req.user = user;
            next();
     } catch (error) {
        next(error)
     }

};


export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendResponse(_res, { message: "Unauthorized", error: true }, 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendResponse(
        _res,
        { message: "Forbidden - you don't have permission", error: true },
        403,
      );
    }

    return next();
  };
}