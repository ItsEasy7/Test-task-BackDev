const dotenv = require("dotenv");
const { Pool } = require("pg");

const auth_service_database = new Pool({
	user: process.env.AUTHUSER,
	host: process.env.AUTHHOST,
	database: process.env.AUTHDATABASE,
	password: process.env.AUTHPASSWORD,
	port: process.env.AUTHPORT,
});

module.exports = {
	created() {
		this.auth_service_database = auth_service_database;
	},
	stopped() {
		this.auth_service_database.end();
	}
};