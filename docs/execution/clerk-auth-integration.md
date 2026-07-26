# Clerk Authentication Integration

## Setup

### 1. Create Clerk Account

Go to [clerk.com](https://clerk.com), sign up, and create a new application.

### 2. Get API Keys

In Clerk dashboard, copy:
- **Publishable Key** - safe for frontend
- **Secret Key** - keep private, use only in backend

### 3. Configure Environment

**Backend (.env):**
```
CLERK_SECRET_KEY=sk_test_...
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Frontend Integration

The web app uses `@clerk/nextjs` for authentication.

### Protected Routes

Wrap routes that require login in a layout with auth check:

```tsx
import { auth } from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Render protected content
}
```

### User Button

Display logged-in user and logout:

```tsx
import { UserButton } from "@clerk/nextjs";

export default function Header() {
  return <UserButton />;
}
```

## Backend Verification

Middleware in API routes verifies Clerk tokens:

```typescript
import { verifyClerkToken } from "../middleware/auth.js";

app.use("/api/protected", async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const auth = await verifyClerkToken(token);
    req.auth = auth;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});
```

## Organization Support

Clerk Organizations allow multi-tenant workspaces:

1. Create org in Clerk dashboard
2. Invite users to org
3. API will include `org_id` in verified token
4. Backend enforces org-level access control

Example:

```typescript
const { userId, orgId } = await verifyClerkToken(token);

// Only return data for user's org
const workflows = await query(
  "SELECT * FROM installed_workflows WHERE org_id = $1",
  [orgId]
);
```

## Testing

**Without real Clerk:**

For local development testing, the auth middleware has a mock mode. See [src/middleware/auth.ts](../../apps/api/src/middleware/auth.ts#L1).

**With Clerk:**

1. Install dependencies: `npm install`
2. Set real Clerk keys in `.env.local`
3. Sign in with test user on http://localhost:3000
4. Clerk will issue real auth tokens for API calls

## Logout and Session Management

Clerk handles session lifecycle. Users can:
- Log out via `<UserButton />`
- Session automatically expires after inactivity
- Mobile SDK support available for mobile apps

## Next Steps

- Implement org invite flow in web UI
- Add RBAC enforcement for membership roles (owner, operator, reviewer)
- Sync Clerk users to local membership table on signup
