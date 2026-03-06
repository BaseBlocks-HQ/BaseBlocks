import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./authSetup";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
