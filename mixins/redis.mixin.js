const redisModule = require("redis");

module.exports = {
	async created() {
		this.redis = redisModule.createClient({
			url: process.env.CACHER
		});

		this.redis.on("error", (e) => console.log(`Redis error: ${e.message}`));
		this.redis.on("ready", () => console.log("Connected to Redis"));

		await this.redis.connect();
	},

	async stopped() {
		if (this.redis) {
			await this.redis.quit();
		}
	}
};