import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig:{port:number, host:any, password:any} = {
	port: 6379,
	host: process.env.REDIS_ENDPOINT,
	password: process.env.REDIS_PASSWORD,
};

const redis:Redis = new Redis(redisConfig);

redis.on("error", (err) => {
	console.log("Redis Client Error", err);
});

redis.on("connect", () => {
	console.log("Redis Client Connected");
});

const setJsonDataToKey = async (key: string, data: any, path: string = "$") => {
	try {
		const response = await redis.call(
			"JSON.SET",
			key,
			path,
			JSON.stringify(data)
		);

		if (response === "OK") {
			return { code: 200, msg: "Data successfully set to key" };
		} else {
			return { code: 400, msg: "Could not set data to key" };
		}
	} catch (e) {
		console.log(e);
		return { code: 400, msg: "Could not set data to key" };
	}
};

const deleteJsonDataFromKey = async (key: string) => {
	try {
		if (!key) return { code: 404, msg: "Key missing" };

		const response = await redis.call("DEL", key);

		if (response === 1) {
			return { code: 200, msg: "Key successfully removed" };
		} else {
			return { code: 400, msg: "Key does not exist" };
		}
	} catch (e) {
		return { code: 400, msg: "Could not delete key" };
	}
};

const getJsonDataFromKey = async (key: string, path?: string) => {
	try {
		let getAttributeExisting: any;

		if (path) {
			getAttributeExisting = await redis.call("JSON.GET", key, path);
		} else {
			getAttributeExisting = await redis.call("JSON.GET", key);
		}

		if (getAttributeExisting) return JSON.parse(getAttributeExisting);
		else return null;
	} catch (e) {
		return null;
	}
};

const numIncrByRedis = async (key:string, path:string, value:number) => {
	try {
		path = path || "$";

		const response:any = await redis.call("JSON.NUMINCRBY", key, path, value);

		if (response == "OK" || !isNaN(response)) {
			return { code: 200, msg: "Data successfully set to key" };
		} else {
			return { code: 200, msg: "Could not set data to key" };
		}
	} catch (e) {
		console.log(e);
		return { code: 400, msg: "Could not set data to key" };
	}
};

const incrementRedis = async (key:string, path:string) => {
	try {
		let res:{code:number, msg:string} = await numIncrByRedis(key, path, 1);

		return res;
	} catch (e) {
		console.log(e);
		return { code: 400, msg: "Could not set data to key" };
	}
};


export {
	setJsonDataToKey,
	deleteJsonDataFromKey,
	getJsonDataFromKey,
	incrementRedis
};
