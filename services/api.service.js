"use strict";
const ApiGateway = require("moleculer-web");
const dotenv = require("dotenv");

module.exports = {
	name: "api",
	mixins: [ApiGateway],
	actions: {
		getListOfActions: {
			rest: {
				method: "GET",
				path: "/getListOfActions"
			},
			async handler(ctx){
				const services = await ctx.call("$node.services");
				const actions = await ctx.call("$node.actions");
				return{
					services,
					actions
				};
			}
		},
	},
	settings: {
		cors: {
			origin: "*",
			methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
			allowedHeaders: [],
			exposedHeaders: [],
			credentials: false,
			maxAge: 3600
		},
		port: process.env.PORT || 3000,
		routes: [
			{
				path: "/api",
				whitelist: [
					"**"
				],
				aliases: {},
				onAfterCall(ctx, route, req, res, data) {
					if (ctx.meta.$statusCode && ctx.meta.$location) {
						res.writeHead(ctx.meta.$statusCode, { Location: ctx.meta.$location });
						res.end();
					}
					return data;
				},
				use: [
					(req, res, next) => {
						const authHeader = req.headers["authorization"];
						const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
						req.$ctx.meta.accessToken = token || req.body.accessToken;

						req.$ctx.meta.clientIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
						req.$ctx.meta.clientOS = req.headers["user-agent"];
						next();
					}
				],
				mergeParams: true,
				authentication: false,
				authorization: false,
				autoAliases: true,
				callOptions: {},
				bodyParsers: {
					json: true,
					urlencoded: { extended: true }
				},
				mappingPolicy: "all",
				logging: false
			},
			{
				path: "/api/openapi",
				aliases: {
					"GET /openapi.json": "openapi.generateDocs",
					"GET /ui": "openapi.ui",
					"GET /assets/:file": "openapi.assets",
				},
				whitelist: ["openapi.*"],
				autoAliases: true,
				bodyParsers: {
					json: true,
				},
			},
		],
		assets: {
			folder: "public"
		},
	},
};