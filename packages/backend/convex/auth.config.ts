export default {
  providers: [
    {
      domain:
        process.env.ENTITY_AUTH_ISSUER_URL ||
        "https://entityy-entity-auth.vercel.app",
      applicationID: "convex",
    },
  ],
};
