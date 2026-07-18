# Music providers

Each provider adapter is responsible for authentication, request signing, rate-limit handling,
error mapping, and conversion into the normalized contracts in `../contracts.ts`.

Provider credentials must stay on the server. Client components should access providers through
an application service or an App Router API route.
