namespace JokesDatabaseCleaner {
	var mysql = require("mysql2/promise");
	require('dotenv').config();

	require('util').inspect.defaultOptions.depth = 1;
	//console.log(process.env);
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
			data.users = await connection_1.query("SELECT * FROM `users-permissions_user`");
			data.pages = await connection_1.query("SELECT * FROM pages");
			data.comments = await connection_1.query("SELECT * FROM comments");
			data.votes = await connection_1.query("SELECT * FROM votes");
			data.jokes = await connection_1.query("SELECT * FROM jokes");
			data.jokes_votes = await connection_1.query("SELECT * FROM jokes__votes");
			data.jokes_tags = await connection_1.query("SELECT * FROM jokes_tags__tags_jokes");
			data.comments_comment_author_user_links = [];
			data.users_roles = [];
			data.votes_authors = [];
			data.jokes_authors = [];

			// fix jokes parameters
			data.jokes[0] = data.jokes[0].map((joke) => {
				data.jokes_authors.push({
					joke_id: joke.id,
					user_id: joke.created_by,
				});

				renameObjectProperty(joke, "created_by", "created_by_id");
				renameObjectProperty(joke, "updated_by", "updated_by_id");
				joke.created_by_id = 1;
				joke.updated_by_id = 1;

				delete joke.author;
				return joke;
			});

			// fix user parameters
			data.users[0] = data.users[0].map((user) => {
				data.users_roles.push({
					user_id: user.id,
					role_id: user.role
				})

				delete user.role;

				if (user.adult_content == 'hide') {
					user.adult_content = 'moderate';
				} else {
					user.adult_content = 'open';
				}

				renameObjectProperty(user, "resetPasswordToken", "reset_password_token");
				renameObjectProperty(user, "created_by", "created_by_id");
				renameObjectProperty(user, "updated_by", "updated_by_id");
				renameObjectProperty(user, "confirmationToken", "confirmation_token");
				renameObjectProperty(user, "adult_content", "safe_content_preference");

				return user;
			})

			// fix comments complicated
			data.comments[0] = data.comments[0].map((comment) => {
				if (comment.authorUser) {
					data.comments_comment_author_user_links.push({
						user_id: comment.authorUser,
						comment_id: comment.id
					})
				}

				renameObjectProperty(comment, "authorName", "author_name");
				renameObjectProperty(comment, "authorEmail", "author_email");
				renameObjectProperty(comment, "authorAvatar", "author_avatar");
				renameObjectProperty(comment, "created_by", "created_by_id");
				renameObjectProperty(comment, "updated_by", "updated_by_id");
				renameObjectProperty(comment, "approvalStatus", "approval_status");

				comment.related = `api::joke:joke:${comment.relatedSlug.split(':')[1]}`;
				delete comment.relatedSlug;
				delete comment.blockedThread;
				delete comment.blockReason;
				delete comment.points;
				delete comment.authorUser;
				delete comment.authorType;
				delete comment.authorId;
				delete comment.threadOf;
				delete comment.author;

				return comment;
			})

			// fix tags
			data.tags[0] = data.tags[0].map((tag) => {
				if (tag.adult_content == 'hide') {
					tag.adult_content = 'moderate';
				} else {
					tag.adult_content = 'open';
				}

				renameObjectProperty(tag, "adult_content", "safe_content_preference");
				renameObjectProperty(tag, "created_by", "created_by_id");
				renameObjectProperty(tag, "updated_by", "updated_by_id");

				return tag;
			})

			// fix pages
			data.pages[0] = data.pages[0].map((page) => {
				renameObjectProperty(page, "created_by", "created_by_id");
				renameObjectProperty(page, "updated_by", "updated_by_id");

				return page;
			})

			// fix votes
			data.votes[0] = data.votes[0].map((vote) => {
				if (vote.author) {
					data.votes_authors.push({
						vote_id: vote.id,
						user_id: vote.author
					})
				}
				else if (vote.created_by != 1) {
					data.votes_authors.push({
						vote_id: vote.id,
						user_id: vote.created_by
					})
				}

				delete vote.author;

				renameObjectProperty(vote, "created_by", "created_by_id");
				renameObjectProperty(vote, "updated_by", "updated_by_id");

				vote.created_by_id = 1;
				vote.updated_by_id = 1;

				return vote;
			})

			console.log(`
got:
	${data.jokes[0].length} jokes, 
	${data.tags[0].length} tags, 
	${data.users[0].length} users, 
	${data.comments[0].length} comments
	${data.votes[0].length} votes
	${data.pages[0].length} pages`
			);

			// clear bfore insert
			await resetTablesContent();
			//await chunkAndRun(data.pages[0], 200, "pages");
			//await chunkAndRun(data.users[0], 400, "up_users");
			//await chunkAndRun(data.tags[0], 200, "tags");
			//await chunkAndRun(data.jokes[0], 200, "jokes");
			//await chunkAndRun(data.votes[0], 200, "votes");

			//await chunkAndRun(data.jokes_authors,300,"jokes_author_links");
			await chunkAndRun(data.jokes_tags[0], 200, "jokes_tags_links");
			await chunkAndRun(data.jokes_votes[0], 200, "jokes_votes_links");
			await chunkAndRun(data.users_roles, 400, "up_users_role_links");
			await chunkAndRun(data.votes_authors, 200, "votes_author_links");

			await chunkAndRun(data.comments[0], 400, "comments_comment");
			await chunkAndRun(data.comments_comment_author_user_links, 200, "comments_comment_author_user_links");

			console.log("finished first insert batch");

		}
		catch (error) {
			console.error(error);
		}
	}

	async function chunkAndRun(array: Array<any>, chunk_size: number, table_name: string, reset_table_content: boolean = false) {

		if (reset_table_content) {
			resetTablesContent(table_name);
		}

		connection_1 = await pool1.getConnection();
		connection_2 = await pool2.getConnection();
		const sql_statement = `INSERT INTO ${table_name} SET ?`;
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

		// Kill connections
		connection_1.release();
		connection_2.release();
	}

	function renameObjectProperty(obj, oldProperty, newProperty) {

		Object.defineProperty(
			obj,
			newProperty,
			Object.getOwnPropertyDescriptor(obj, oldProperty)
		);
		delete obj[oldProperty];

	}

	async function resetTablesContent(table_name = '') {
		const database_tables = [
			//'pages',
			//'up_users',
			//'tags',
			//	'jokes',
			//	'votes',
			//	'jokes_author_links',
			'jokes_tags_links',
			'jokes_votes_links',
			'up_users_role_links',
			'votes_author_links',
			'comments_comment',
			'comments_comment_author_user_links',
		];

		await connection_2.query("SET FOREIGN_KEY_CHECKS = 0;");

		for (const table of database_tables) {
			await connection_2.query(`Truncate table ${table}`);
		}

		await connection_2.query("SET FOREIGN_KEY_CHECKS = 1;");
	}

	migrateData();
}
