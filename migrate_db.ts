var mysql = require("mysql2/promise");
require('util').inspect.defaultOptions.depth = 1;

var pool1 = mysql.createPool({
	connectionLimit: 300,

	host: process.env.DATABASE_HOST_OLD,
	user: process.env.DATABASE_USERNAME_OLD,
	password: process.env.DATABASE_PASSWORD_OLD,
	database: process.env.DATABASE_NAME_OLD,
});

var pool2 = mysql.createPool({
	connectionLimit: 300,

	host: process.env.DATABASE_HOST,
	user: process.env.DATABASE_USERNAME,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
});

let connection_1, connection_2;

async function migrateData() {
	connection_1 = await pool1.getConnection();
	connection_2 = await pool2.getConnection();
	try {


		let data: any = {};

		// GET DATA
		data.tags = await connection_1.query("SELECT * FROM tags");
		data.users = await connection_1.query(
			"SELECT * FROM `users-permissions_user`"
		);
		data.users_roles = [];
		data.pages = await connection_1.query("SELECT * FROM pages");
		data.comments = await connection_1.query("SELECT * FROM comments");
		data.votes = await connection_1.query("SELECT * FROM votes");
		data.jokes = await connection_1.query("SELECT * FROM jokes");
		data.jokes_votes = await connection_1.query("SELECT * FROM jokes__votes");
		data.jokes_tags = await connection_1.query(
			"SELECT * FROM jokes_tags__tags_jokes"
		);
		data.jokes_authors = [];

		
		// fix jokes parameters
		data.jokes[0] = data.jokes[0].map((joke) => {
			data.jokes_authors.push({
				joke_id: joke.id,
				user_id: joke.author,
			});
	
			//console.log(joke);
			renameObjectProperty(joke,"created_by", "created_by_id");
			renameObjectProperty(joke,"updated_by", "updated_by_id");
			delete joke.author;
			return joke;
		});
		//console.log(data.jokes[0]);
		// fix user parameters
		//console.log(data.users[0]);
		data.users[0] = data.users[0].map((user) =>{
			data.users_roles.push({
				user_id: user.id,
				role_id: user.role
			})

			delete user.role;

			if(user.adult_content == 'hide'){
				user.adult_content = 'moderate';
			}else{
				user.adult_content = 'open';
			}

			renameObjectProperty(user,"resetPasswordToken", "reset_password_token");
			renameObjectProperty(user,"created_by", "created_by_id");
			renameObjectProperty(user,"updated_by", "updated_by_id");
			renameObjectProperty(user,"confirmationToken", "confirmation_token");
			renameObjectProperty(user,"adult_content", "safe_content_preference");

			return user;
		})
		//console.log(data.users);

		console.log(data.users[0][0]);

		console.log(
			`length of the jokes_authors array is ${data.jokes_authors.length}`
		);

		console.log(
			`got ${data.jokes[0].length} jokes, and ${data.tags[0].length} tags, and ${data.users[0].length} users`
		);

		// INSERT JOKE INTO SECOND DATABASE
		// clear bfore insert
		await connection_2.query("SET FOREIGN_KEY_CHECKS = 0;");
		await connection_2.query("Truncate table jokes");
		await connection_2.query("Truncate table jokes_author_links");
		await connection_2.query("Truncate table up_users");
		await connection_2.query("SET FOREIGN_KEY_CHECKS = 1;");

		
		//await chunkAndRun(data.jokes, 200, "INSERT INTO jokes SET ?");
		await chunkAndRun(data.users[0], 200, "INSERT INTO up_users SET ?");
		await chunkAndRun(data.users_roles[0], 200, "INSERT INTO up_users_role_links SET ?");
		console.log("finished first insert batch");
		//await chunkAndRun(data.jokes_authors,300,"INSERT INTO jokes_author_links SET ?"	);

		
	} catch (error) {
		console.error(error);
	}
}


try {
	migrateData();
} catch (error) {
	console.log(error);
}

async function chunkAndRun(
	array: Array<any>,
	chunk_size: number,
	sql_statement: string
) {


	console.log("executing " + sql_statement);

	let promise_group = array.map((data) => connection_2.query(sql_statement, data));

	let return_array = [];

	for (let i = 0; i < promise_group.length; i += chunk_size) {
		const chunk = promise_group.slice(i, i + chunk_size);
		return_array.push(chunk);
	}

	let count = 1;

	for (const item of return_array) {
		console.log(`inserting batch ${count}/${return_array.length}`);
		const insertResults = await Promise.all(item);
		count++;
	}

	// console.log(insertResult);
	// Kill connections
	connection_1.end();
	connection_2.end();
}

function renameObjectProperty(obj,oldProperty,newProperty){

	Object.defineProperty(
		obj,
		newProperty,
	Object.getOwnPropertyDescriptor(obj, oldProperty)
	);
	delete obj[oldProperty];

}
