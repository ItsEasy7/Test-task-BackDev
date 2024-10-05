const { MoleculerRetryableError} = require("moleculer").Errors;
const DbMixin = require("../mixins/db.mixin.js");
const JWTMixin = require("../mixins/jwt.mixin.js");
const RedisMixin = require("../mixins/redis.mixin");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

module.exports = {
	name: "users",
	settings: {
		$shutdownTimeout: 120000
	},
	validator: true,
	mixins: [DbMixin, JWTMixin, RedisMixin],
	actions: {
		/**
         * Метод для получения Bearer
		 * @param {object} ctx
         * 
         * @return {object} 
         */ 
		getBearerTokens: {
			rest:{
				path: "/getBearerTokens",
				method: "GET"
			},
			params: {
				GUID: "string",
			},
			async handler(ctx) {
				/**
				 * Немного от разработчика
				 * 1) Нет смысла в нынешнем исполнении добавлять проверку на отсуствие GUID, поскольку в Moleculer уже стоит валидатор
				 * 2) Хранение refresh в redis - крайне важный момент, даёт нам доступ к мульти сессии
				 * 3) Запись истории авторизации уже отсЪебятина, в любом случае после авторизации мы записываем историю для множества всякого
				 */
				const user = await this.auth_service_database.query("SELECT * FROM users WHERE user_id = $1", [ctx.params.GUID]);
				this.logger.info(`Got GUID - ${ctx.params.GUID}`);
				
				if(!user.rowCount > 0) throw new MoleculerRetryableError("Unable to get user", 404, "UNABLE_GET_USER");
				this.logger.info("Preparing for generating bearer tokens...");
				let userData = user.rows[0];
				
				await this.auth_service_database.query("INSERT INTO auth_history (user_id, authorized_at, auth_status_id, auth_type_id, ip_address, device_os) VALUES ($1, NOW(), 1, 1, $2, $3)", [userData.user_id, ctx.meta.clientIp, ctx.meta.clientOS]);

				const bearer = await this.createAndBindToken(await this.generatePayload(userData.user_id));

				return {
					status: 200,
					response: {
						bearer
					}
				};  
			}                         
		},

		refreshAccessToken: {
			rest: {
				path: "/refreshAccessToken",
				method: "POST"
			},
			params: {
				refreshToken: "string",
			},
			async handler(ctx) {
				try {
					const user = await jwt.verify(ctx.params.refreshToken, process.env.REFRESH_TOKEN_SECRET);
		
					const sessionData = await this.redis.get(`session_storage:${ctx.params.refreshToken}`);
					console.log(sessionData);
					if (!sessionData) {
						throw new MoleculerRetryableError("UNAUTHORIZE", 401, "UNAUTHORIZE");
					}
		
					const bearer = await this.generateAccessToken(await this.generatePayload(userData.user_id));
		
					return {
						status: 200,
						response: {
							accessToken,
							tokenStatus: true
						}
					};
				} catch (e) {
					await this.redis.del(`session_storage:${ctx.params.refreshToken}`);
					throw new MoleculerRetryableError("RefreshTokenError", 401, "UNAUTHORIZE");
				}
			}
		},
	},

	created() {},
	started() {},
	stopped() {}
};