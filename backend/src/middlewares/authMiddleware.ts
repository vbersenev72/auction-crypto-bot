import { NextFunction, Request, Response, RequestHandler } from "express"
import { env } from "../.."
import jwt from 'jsonwebtoken'
import { CustomRequest } from "../../request"

export const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        next()
    }

    try {
        const token = req['headers']['authorization']?.split(' ')[1]
        if (!token) {
            return res.status(401).json({ message: 'Auth error' })
        }
        const decoded = jwt.verify(token, env.SECRET)

        const requestWithUser = req as CustomRequest
        requestWithUser.userId = typeof decoded === 'string'
          ? decoded
          : (decoded as jwt.JwtPayload).id ?? (decoded as jwt.JwtPayload).sub ?? ''

        next()
    } catch (error) {
        return res.status(401).json({ message: 'Auth error' })
    }
}