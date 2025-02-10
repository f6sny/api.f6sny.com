namespace JokesDatabaseCleaner {
	// Configuration options
	const CONFIG = {
		CHUNK_SIZE: 50, // Single chunk size for all operations
		DATABASE: {
			connectionLimit: 300,
			tables: [
				'pages',
				'up_users',
				'tags',
				'jokes',
				'votes',
				'jokes_author_links',
				'jokes_tags_links',
				'jokes_votes_links',
				'up_users_role_links',
				'votes_author_links',
				// 'comments', // To be migrated in the future
				// 'comments_comment_author_user_links', // To be migrated in the future
			]
		},
		PROGRESS_BAR: {
			format: '|{bar}| {percentage}% | {value}/{total} records | Batch: {batch}',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			clearOnComplete: false,
			hideCursor: true
		}
	};

	// Dependencies
	var mysql = require("mysql2/promise");
	require('dotenv').config();
	const chalk = require('chalk');
	const cliProgress = require('cli-progress');
	const Table = require('cli-table3');

	require('util').inspect.defaultOptions.depth = 1;
	//console.log(process.env);
	var pool1 = mysql.createPool({
		connectionLimit: CONFIG.DATABASE.connectionLimit,
		host: process.env.DATABASE_HOST_OLD,
		user: process.env.DATABASE_USERNAME_OLD,
		password: process.env.DATABASE_PASSWORD_OLD,
		database: process.env.DATABASE_NAME_OLD,
	});

	var pool2 = mysql.createPool({
		connectionLimit: CONFIG.DATABASE.connectionLimit,
		host: process.env.DATABASE_HOST,
		user: process.env.DATABASE_USERNAME,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
	});

	let connection_1, connection_2;
	let multibar: any = null;

	// Add color mapping for tables
	const tableColors = {
		'pages': chalk.cyan,
		'up_users': chalk.magenta,
		'tags': chalk.yellow,
		'jokes': chalk.blue,
		'votes': chalk.red,
		'jokes_author_links': chalk.greenBright,
		'jokes_tags_links': chalk.blueBright,
		'jokes_votes_links': chalk.magentaBright,
		'up_users_role_links': chalk.yellowBright,
		'votes_author_links': chalk.cyanBright,
	};

	// Helper function to get color for table
	function getTableColor(tableName: string) {
		return tableColors[tableName] || chalk.white;
	}

	async function displayDataSummary(data: any) {
		const table = new Table({
			head: [
				chalk.white.bold('Content Type'), 
				chalk.white.bold('Count'),
				chalk.white.bold('Status')
			],
			style: {
				head: [], // Disable colors for header background
				border: [] // Disable colors for borders
			}
		});

		const summaryData = [
			['Jokes', data.jokes[0].length, getTableColor('jokes')('Ready')],
			['Tags', data.tags[0].length, getTableColor('tags')('Ready')],
			['Users', data.users[0].length, getTableColor('up_users')('Ready')],
			['Comments', data.comments[0].length, chalk.gray('Not migrated')],
			['Votes', data.votes[0].length, getTableColor('votes')('Ready')],
			['Pages', data.pages[0].length, getTableColor('pages')('Ready')]
		];

		// Add rows with their respective colors
		summaryData.forEach(([type, count, status]) => {
			table.push([
				getTableColor(type.toLowerCase())(type),
				count.toString().padStart(6),
				status
			]);
		});

		console.log('\nMigration Data Summary:');
		console.log(table.toString());
		console.log(); // Add empty line after table
	}

	async function migrateData() {
		try {
			// Use connection pooling more efficiently by getting connections once
			const [connection1, connection2] = await Promise.all([
				pool1.getConnection(),
				pool2.getConnection()
			]);

			connection_1 = connection1;
			connection_2 = connection2;

			// Fetch data concurrently
			const [
				[tags], 
				[users], 
				[pages], 
				[comments], // Keep fetching comments data
				[votes], 
				[jokes],
				[jokesVotes],
				[jokesTags]
			] = await Promise.all([
				connection_1.query("SELECT * FROM tags"),
				connection_1.query("SELECT * FROM `users-permissions_user`"),
				connection_1.query("SELECT * FROM pages"),
				connection_1.query("SELECT * FROM comments"), // Keep this query
				connection_1.query("SELECT * FROM votes"),
				connection_1.query("SELECT * FROM jokes"),
				connection_1.query("SELECT * FROM jokes__votes"),
				connection_1.query("SELECT * FROM jokes_tags__tags_jokes")
			]);

			const data = {
				tags: [tags],
				users: [users],
				pages: [pages],
				comments: [comments], // Keep this in data object
				votes: [votes],
				jokes: [jokes],
				jokes_votes: [jokesVotes],
				jokes_tags: [jokesTags],
				comments_comment_author_user_links: [], // Keep this for future
				users_roles: [],
				votes_authors: [],
				jokes_authors: []
			};

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

			// Display data summary first
			await displayDataSummary(data);

			// Reset tables
			console.log('\nResetting Tables Content');
			await resetTablesContent();

			// Initialize multibar
			multibar = new cliProgress.MultiBar({
				...CONFIG.PROGRESS_BAR,
				format: '{contentType} {bar} {percentage}% | {value}/{total} | Batch: {batch} | Chunk: {chunkSize}'
			}, {
				align: 'left',
				borderChar: '│',
				stream: process.stdout,
				linewrap: false,
			});

			// Group 1: Base tables
			console.log('\nMigrating Base Tables:');
			console.log('Content Type          Progress                                    Stats                  Batch Info');
			console.log('─'.repeat(100));
			
			await Promise.all([
				chunkAndRun(data.pages[0], "pages"),
				chunkAndRun(data.users[0], "up_users"),
				chunkAndRun(data.tags[0], "tags"),
			]);

			// Group 2: Content tables
			console.log('\nMigrating Content Tables:');
			console.log('Content Type          Progress                                    Stats                  Batch Info');
			console.log('─'.repeat(100));
			
			await Promise.all([
				chunkAndRun(data.jokes[0], "jokes"),
				chunkAndRun(data.votes[0], "votes"),
			]);

			// Group 3: Relationship tables
			console.log('\nMigrating Relationship Tables:');
			console.log('Content Type          Progress                                    Stats                  Batch Info');
			console.log('─'.repeat(100));
			
			await Promise.all([
				chunkAndRun(data.jokes_authors, "jokes_author_links"),
				chunkAndRun(data.jokes_tags[0], "jokes_tags_links"),
				chunkAndRun(data.jokes_votes[0], "jokes_votes_links"),
				chunkAndRun(data.users_roles, "up_users_role_links"),
				chunkAndRun(data.votes_authors, "votes_author_links")
			]);

			multibar.stop();
			console.log(chalk.green("\n✓ Migration completed successfully"));

		} catch (error) {
			if (multibar) multibar.stop();
			console.error(chalk.red("\nMigration failed:"), error);
			throw error;
		} finally {
			if (connection_1) connection_1.release();
			if (connection_2) connection_2.release();
		}
	}

	async function chunkAndRun(array: Array<any>, table_name: string, reset_table_content: boolean = false) {
		const tableColor = getTableColor(table_name);
		
		if (reset_table_content) {
			resetTablesContent(table_name);
		}

		const firstRow = array[0];
		const columns = Object.keys(firstRow);
		const placeholders = columns.map(() => '?').join(', ');
		const columnsList = columns.join(', ');
		const sql_statement = `INSERT INTO ${table_name} (${columnsList}) VALUES (${placeholders})`;
		
		const stmt = await connection_2.prepare(sql_statement);

		// Create a progress bar in the multibar container
		const progressBar = multibar.create(array.length, 0, {
			contentType: tableColor(table_name.padEnd(20)),
			chunkSize: CONFIG.CHUNK_SIZE,
			total: array.length,
			batch: '0/0'
		});

		try {
			let count = 1;
			const totalBatches = Math.ceil(array.length / CONFIG.CHUNK_SIZE);
			
			for (let i = 0; i < array.length; i += CONFIG.CHUNK_SIZE) {
				const chunk = array.slice(i, i + CONFIG.CHUNK_SIZE);
				await Promise.all(chunk.map(data => {
					const values = columns.map(col => data[col]);
					return stmt.execute(values);
				}));
				progressBar.update(i + chunk.length, { batch: `${count}/${totalBatches}` });
				count++;
			}
			
			progressBar.update(array.length, { batch: `${totalBatches}/${totalBatches}` });
		} catch (error) {
			console.error(`\nError inserting into ${tableColor(table_name)}:`, error);
			throw error;
		} finally {
			await stmt.close();
		}
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
		await connection_2.query("SET FOREIGN_KEY_CHECKS = 0;");

		for (const table of CONFIG.DATABASE.tables) {
			const tableColor = getTableColor(table);
			console.log(`Resetting content for ${tableColor(table)}`);
			await connection_2.query(`Truncate table ${table}`);
		}

		await connection_2.query("SET FOREIGN_KEY_CHECKS = 1;");
		console.log(chalk.green('✓'), 'Tables content reset completed');
	}

	migrateData();
}
