export interface AuthCheckResult {
  authExists: boolean;
  profileExists: boolean;
  userType?: 'customer' | 'merchant';
  profileData?: any;
}

/**
 * Obsolete auth helper service.
 * Live auth, verification, routing, and profile creation are handled by
 * Supabase auth, database triggers, and the active route flow.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export class AuthService {
  static async checkEmailExists(): Promise<AuthCheckResult> {
    return {
      authExists: false,
      profileExists: false,
      profileData: null,
    };
  }

  static async checkProfileExists(): Promise<{ exists: boolean; profileData?: any }> {
    return {
      exists: false,
      profileData: null,
    };
  }

  static async validateEmailFormat(email: string): Promise<boolean> {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static async validatePassword(password: string): Promise<{ valid: boolean; message?: string }> {
    if (!password) {
      return { valid: false, message: 'Password is required' };
    }
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }
    return { valid: true };
  }

  static getErrorMessage(error: any): string {
    if (!error) return 'An unknown error occurred';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'An unexpected error occurred. Please try again.';
  }
}

export default AuthService;