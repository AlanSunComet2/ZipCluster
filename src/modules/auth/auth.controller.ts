import type { Request, Response } from "express";
import type { AuthService } from "./auth.service";
import type { LoginInput, RefreshTokenInput, RegisterInput, SsoInput } from "./auth.schemas";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body);
    res.status(201).json(result);
  };

  login = async (req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body);
    res.status(200).json(result);
  };

  refresh = async (req: Request<unknown, unknown, RefreshTokenInput>, res: Response): Promise<void> => {
    const result = await this.authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  };

  googleSso = async (req: Request<unknown, unknown, SsoInput>, res: Response): Promise<void> => {
    const result = await this.authService.ssoLogin(req.body);
    res.status(200).json({ provider: "google", ...result });
  };

  appleSso = async (req: Request<unknown, unknown, SsoInput>, res: Response): Promise<void> => {
    const result = await this.authService.ssoLogin(req.body);
    res.status(200).json({ provider: "apple", ...result });
  };
}
