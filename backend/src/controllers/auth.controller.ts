import { Request } from "express";
import { defaultUnexpectedError } from "../decorators/defaultUnexpectedError";
import { AuthService } from "../services/auth";
import { LoginRequestData, RegisterRequestData } from "../../../types/auth";

class AuthController {
  @defaultUnexpectedError("Can not register")
  async register(req: Request<RegisterRequestData>) {
    const register = await AuthService.register(req.body)
    if (register.status === 'failed') return {
        status: 'failed',
        message: register.message
    };
    
    return {
      status: "ok",
      token: register.token
    };
  }

  @defaultUnexpectedError("Can not login")
  async login(req: Request<LoginRequestData>) {
    const login = await AuthService.login(req.body)

    if (login.status !== 'ok') return {
        status: "failed",
        message: login.message
    }

    return {
      status: "ok",
      token: login.token
    };
  }
}

export const authControllerInstanse = new AuthController();
