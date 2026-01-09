import z from "zod";
import { validate } from "../backend/src/middlewares/validate";

export const registerSchema = z.object({
    username: z.string().refine((val) => val.length < 10, 'Usename length is more than 10 characters'),
    password: z.string().refine((val) => val.length > 8, 'Password length is less than 9 characters')
})
export type RegisterRequestData = z.infer<typeof registerSchema>
export const validateRegisterSchema = validate(registerSchema)

export const loginSchema = z.object({
    username: z.string().refine((val) => val.length < 10, 'Usename length is more than 10 characters'),
    password: z.string().refine((val) => val.length > 8, 'Password length is less than 9 characters')
})
export type LoginRequestData = z.infer<typeof registerSchema>
export const validateLoginSchema = validate(loginSchema)
