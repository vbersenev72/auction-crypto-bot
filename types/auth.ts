import z from "zod";
import { validate } from "../backend/src/middlewares/validate";

export const registerSchema = z.object({
    username: z.string(),
    password: z.string()
})
export type RegisterRequestData = z.infer<typeof registerSchema>
export const validateRegisterSchema = validate(registerSchema)

export const loginSchema = z.object({
    username: z.string(),
    password: z.string()
})
export type LoginRequestData = z.infer<typeof registerSchema>
export const validateLoginSchema = validate(loginSchema)
