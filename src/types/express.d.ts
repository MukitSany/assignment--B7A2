import type { RUser } from "./index";

declare global {
  namespace Express {
    interface Request {
      user?: RUser & {
        id: string;
      };
      cookies?: Record<string, string>;
    }
  }
}

export{};