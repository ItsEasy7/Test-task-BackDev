const jwt = require("jsonwebtoken");
const { MoleculerRetryableError } = require("moleculer").Errors;
const RedisMixin = require("./redis.mixin");
const dotenv = require("dotenv");

module.exports = {
	mixins: [RedisMixin],
	methods: {
		/**
		 * Создаёт payload для дальнейшей генерации JWT
		 * 
		 * @param {string} user_id 
		 * @returns 
		 */
		async generatePayload(user_id){ 
			const user = await this.auth_service_database.query("SELECT * FROM users WHERE user_id =$1", [user_id]);
			const userData = user.rows[0];
			//Любую инфу с юзерна можно загнать в paayload
			const payload = {
				user_id: userData.user_id,
			};
			return payload;
		},

		/**
		* Генерация accessToken
		*
		* @param {Object} payload
		*/
		generateAccessToken(payload) {
			let accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRES});
			return accessToken;
		},

		/**
		* Генерация пар токенов: accessToken и refreshToken
		* @param {Object} payload - данные запроса, тело и строка
		*/
		async createAndBindToken(payload) {
			// Проверяем, забанен ли пользователь
			const isUserBanned = await this.auth_service_database.query(
				"SELECT 1 FROM users WHERE user_id = $1 AND is_banned = true", 
				[payload.user_id]
			);
			if (isUserBanned.rowCount > 0) {
				throw new MoleculerRetryableError("User is banned", 401, "BANNED_USER");
			}

			const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: process.env.ACCESS_TOKEN_EXPIRES,
			});
			const refreshToken = jwt.sign(
				{ user_id: payload.user_id }, 
				process.env.REFRESH_TOKEN_SECRET, 
				{ expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
			);
			const decodedToken = jwt.decode(refreshToken);

			const sessionData = {
				refresh_token: refreshToken,
				created_at: new Date(decodedToken.iat * 1000).toISOString(),
				exp_at: new Date(decodedToken.exp * 1000).toISOString(),
				user_id: payload.user_id,
				active: true
			};
			await this.redis.set(
				`session_storage:${refreshToken}`, 
				JSON.stringify(sessionData)
			);
			await this.redis.expire(
				`session_storage:${refreshToken}`, 
				decodedToken.exp
			);
			return {
				accessToken,
				refreshToken
			};
			
		},
		
		/**
		* Получаем содержимое токена
		* 
		* @param {string} token 
		* @returns 
		*/
		async parseJWT(ctx) {
			try {
				const payload = await jwt.verify(ctx.meta.accessToken, process.env.ACCESS_TOKEN_SECRET);
				return payload;
			} catch (e) {
				throw new MoleculerRetryableError("UNAUTHORIZE", 401, "UNAUTHORIZE");
			}
		},
	}
};