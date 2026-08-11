# Environment topology

BaseBlocks has three isolated runtime environments. Provider credentials must
not be shared across these boundaries.

| Environment | Web origin | Convex | Google Cloud project |
| --- | --- | --- | --- |
| Development | `http://localhost:3001` | Personal Development deployment | `baseblocks-development` |
| Preview | Vercel-generated `*.vercel.app` URL | Branch-specific Preview deployment | `rapid-entry-505021-f6` (`BaseBlocks Preview`) |
| Production | `https://baseblocks.dev` | `quiet-alligator-768` | `baseblocks-production` |

## Deployment flow

1. Local development loads Vercel Development variables and runs the personal
   Convex Development deployment.
2. Every Vercel Preview build uses the Preview deploy key. Convex creates or
   reuses the branch's Preview deployment before the Next.js build starts.
3. Pull-request checks and the Vercel Preview deployment must pass before a
   change is merged.
4. Merging to `main` produces the Vercel Production deployment and deploys the
   backend with the production Convex deploy key.

## OAuth ownership

Google, GitHub, and Microsoft clients are environment-specific. Development
clients accept only localhost callbacks, Preview clients use the stable
Vercel-generated Preview alias, and Production clients accept only
`baseblocks.dev` callbacks.

Generated Vercel Preview deployment origins are trusted by the Convex Preview
defaults through the project-specific `https://base-blocks-*.vercel.app`
pattern. Google returns to the stable
`https://baseblocks-owner-preview.vercel.app/api/auth/callback/google`
callback before Better Auth returns the user to the originating generated
Preview deployment.

## Domains

The Vercel project owns only these application domains:

- `baseblocks.dev`
- `*.baseblocks.dev`
- the Vercel-provided `base-blocks-liard.vercel.app` domain

Preview deployments use Vercel-generated URLs. Do not add custom
`preview.baseblocks.dev` domains.
