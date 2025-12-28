import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../services/supabase';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export async function supabaseAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(
        'Authorization header required. Provide a Bearer token.',
        'MISSING_AUTH_TOKEN'
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new UnauthorizedError('Auth service not configured', 'AUTH_NOT_CONFIGURED');
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email || '',
    };

    next();
  } catch (error) {
    next(error);
  }
}
