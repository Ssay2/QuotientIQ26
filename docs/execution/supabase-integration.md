# Supabase Integration

## Environment Configuration

Add these values to a local `.env` file and never commit the `.env` file.

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
SUPABASE_SECRET_KEY=sb_secret_your_secret_key
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
```

## Use Cases

- `SUPABASE_URL` is your Supabase project endpoint.
- `SUPABASE_PUBLISHABLE_KEY` is used by the frontend for client-side SDKs.
- `SUPABASE_SECRET_KEY` is used by backend services for secure access.
- `SUPABASE_JWKS_URL` is used to verify JWTs from Supabase auth.

## Security Notes

- Keep `SUPABASE_SECRET_KEY` private.
- Use separate service keys for production and development.
- Do not store secrets in Git.
