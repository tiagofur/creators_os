import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  authResponseSchema,
} from '../auth';

describe('loginSchema', () => {
  const validLogin = {
    email: 'user@example.com',
    password: 'Password1',
  };

  it('accepts valid login data', () => {
    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'Password1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ ...validLogin, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address');
    }
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({ ...validLogin, password: 'Pass1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
    }
  });

  it('accepts password of exactly 8 characters', () => {
    const result = loginSchema.safeParse({ ...validLogin, password: 'Abcdefg1' });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  const validRegister = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password1',
    password_confirmation: 'Password1',
    terms_accepted: true,
  };

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'bad-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue).toBeDefined();
      expect(emailIssue!.message).toBe('Invalid email address');
    }
  });

  it('rejects password too short', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'Pass1',
      password_confirmation: 'Pass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.path.includes('password'));
      expect(pwIssue).toBeDefined();
      expect(pwIssue!.message).toBe('Password must be at least 8 characters');
    }
  });

  it('rejects password missing uppercase letter', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'password1',
      password_confirmation: 'password1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find(
        (i) => i.path.includes('password') && i.message.includes('uppercase'),
      );
      expect(pwIssue).toBeDefined();
      expect(pwIssue!.message).toBe('Password must contain at least one uppercase letter');
    }
  });

  it('rejects password missing number', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'Passwordd',
      password_confirmation: 'Passwordd',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find(
        (i) => i.path.includes('password') && i.message.includes('number'),
      );
      expect(pwIssue).toBeDefined();
      expect(pwIssue!.message).toBe('Password must contain at least one number');
    }
  });

  it('rejects name too short', () => {
    const result = registerSchema.safeParse({ ...validRegister, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'));
      expect(nameIssue).toBeDefined();
      expect(nameIssue!.message).toBe('Name must be at least 2 characters');
    }
  });

  it('rejects name exceeding 100 characters', () => {
    const result = registerSchema.safeParse({ ...validRegister, name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts name of exactly 2 characters', () => {
    const result = registerSchema.safeParse({ ...validRegister, name: 'Jo' });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password_confirmation: 'Different1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatchIssue = result.error.issues.find((i) =>
        i.path.includes('password_confirmation'),
      );
      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue!.message).toBe('Passwords do not match');
    }
  });

  it('rejects terms not accepted (false)', () => {
    const result = registerSchema.safeParse({ ...validRegister, terms_accepted: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      const termsIssue = result.error.issues.find((i) => i.path.includes('terms_accepted'));
      expect(termsIssue).toBeDefined();
      expect(termsIssue!.message).toBe('You must accept the terms and conditions');
    }
  });

  it('rejects missing required fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address');
    }
  });

  it('rejects missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const validReset = {
    token: 'abc123',
    password: 'NewPass1',
    password_confirmation: 'NewPass1',
  };

  it('accepts valid reset data', () => {
    // Password needs to be >= 8 chars
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'NewPassw1',
      password_confirmation: 'NewPassw1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({ ...validReset, token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects password too short', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'Pass1',
      password_confirmation: 'Pass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.path.includes('password'));
      expect(pwIssue).toBeDefined();
      expect(pwIssue!.message).toBe('Password must be at least 8 characters');
    }
  });

  it('rejects password missing uppercase', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'password1',
      password_confirmation: 'password1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.message.includes('uppercase'));
      expect(pwIssue).toBeDefined();
    }
  });

  it('rejects password missing number', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'Passwords',
      password_confirmation: 'Passwords',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.message.includes('number'));
      expect(pwIssue).toBeDefined();
    }
  });

  it('rejects mismatched password confirmation', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'NewPassw1',
      password_confirmation: 'Different1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatchIssue = result.error.issues.find((i) =>
        i.path.includes('password_confirmation'),
      );
      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue!.message).toBe('Passwords do not match');
    }
  });
});

describe('authResponseSchema', () => {
  const validResponse = {
    access_token: 'eyJhbGciOi...',
    token_type: 'Bearer' as const,
    expires_in: 3600,
  };

  it('accepts valid auth response', () => {
    const result = authResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('rejects wrong token_type literal', () => {
    const result = authResponseSchema.safeParse({ ...validResponse, token_type: 'Basic' });
    expect(result.success).toBe(false);
  });

  it('rejects missing access_token', () => {
    const { access_token, ...rest } = validResponse;
    const result = authResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-number expires_in', () => {
    const result = authResponseSchema.safeParse({ ...validResponse, expires_in: '3600' });
    expect(result.success).toBe(false);
  });
});
