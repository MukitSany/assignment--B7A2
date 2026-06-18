import config from "../config";
import type { RUser } from "../types";
import jwt, { type JwtPayload } from "jsonwebtoken"


export const verifyToken = (token: string, type: "access"|"refresh") => {
    const secret = type ==="refresh"? config.jwt_secret : config.refress_secret
    const decode = jwt.verify(token, secret) as JwtPayload;
    return decode
}



export const signToken = (payload: RUser) => {
    const accessToken = jwt.sign(payload, config.jwt_secret,{
        expiresIn: "2d"
    })

    const token = jwt.sign(payload, config.refress_secret,{
        expiresIn: "10d"
    })

    return {accessToken, token}
    
};

// console.log(singleToken({name:"test", email:"test@sfdjgb.com", role:"contributor"}));