namespace JokesDatabaseCleaner {
	// Dependencies
	var mysql = require("mysql2/promise");
	const chalk = require('chalk');
	const cliProgress = require('cli-progress');
	const Table = require('cli-table3');
	const { createId } = require('@paralleldrive/cuid2');
	require('dotenv').config();
	require('util').inspect.defaultOptions.depth = 1;

	// Configuration options
	const CONFIG = {
		CHUNK_SIZE: 200, // Single chunk size for all operations
		
		DATABASE: {
			connectionLimit: 300,
			tables: [
				'pages',
				'up_users',
				'tags',
				'jokes',
				'plugin_comments_comments',
				'plugin_comments_comments_author_user_lnk',
				'jokes_user_lnk',
				'jokes_tags_lnk',
				'up_users_role_lnk',
				'votes',
				'jokes_votes_lnk',
				'votes_author_lnk',
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

	const tableColors = {
		'pages': chalk.cyan,
		'up_users': chalk.magenta,
		'tags': chalk.yellow,
		'jokes': chalk.blue,
		'votes': chalk.red,
		'jokes_user_lnk': chalk.greenBright,
		'jokes_tags_lnk': chalk.blueBright,
		'jokes_votes_lnk': chalk.magentaBright,
		'up_users_role_lnk': chalk.yellowBright,
		'votes_author_lnk': chalk.cyanBright,
	};

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
	

	// Helper function to get color for table
	function getTableColor(tableName: string) {
		return tableColors[tableName] || chalk.white;
	}

	async function migrateAdminUsers() {
		console.log(chalk.cyan('\nMigrating admin users...'));
		
		// Get admin users from source database
		const [adminUsers] = await connection_1.query(`
			SELECT * FROM \`strapi_administrator\`
			ORDER BY id ASC
		`);

		if (!adminUsers.length) {
			console.log(chalk.yellow('No admin users found'));
			return;
		}

		console.log(chalk.cyan(`Found ${adminUsers.length} admin users`));

		try {   
			// Reset admin_users table
			await resetTablesContent('admin_users');

			// Prepare admin users data
			const processedAdminUsers = adminUsers.map(user => ({
				id: user.id,
				firstname: user.firstname || '',
				lastname: user.lastname || '',
				username: user.username,
				email: user.email,
				document_id: createId(),
				password: user.password,
				reset_password_token: user.resetPasswordToken || null,
				registration_token: user.registrationToken || null,
				is_active: user.isActive ? 1 : 0,
				blocked: user.blocked ? 1 : 0
			}));

			// Insert admin users
			for (const adminUser of processedAdminUsers) {
				await connection_2.query(
					'INSERT INTO admin_users SET ?',
					adminUser
				);
			}

			// Reset admin_users_roles_lnk table
			await resetTablesContent('admin_users_roles_lnk');

			// migrate strapi_users_roles to admin_users_roles_lnk
			// user_id, role_id
			const [adminUsersRoles] = await connection_1.query(`
				SELECT * FROM \`strapi_users_roles\`
				ORDER BY id ASC
			`);	

			for (const adminUserRole of adminUsersRoles) {
				await connection_2.query(
					'INSERT INTO admin_users_roles_lnk SET ?',
					adminUserRole
				);
			}
			
			console.log(chalk.green('✓ Admin users migration completed'));
		} catch (error) {
			console.error(chalk.red('Error migrating admin users:'), error);
			throw error;
		}
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
			['Comments', data.comments[0].length, getTableColor('comments')('Ready')],
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

			// Migrate admin users first
			await migrateAdminUsers();

			const [
				[tags], 
				[pages], 
				[comments],
				[votes], 
				[jokes],
				[jokesVotes],
				[jokesTags],
				[users]
			] = await Promise.all([
				connection_1.query("SELECT * FROM tags"),
				connection_1.query("SELECT * FROM pages"),
				connection_1.query("SELECT * FROM comments"),
				connection_1.query("SELECT * FROM votes"),
				connection_1.query("SELECT * FROM jokes"),
				connection_1.query("SELECT * FROM jokes__votes"),
				connection_1.query("SELECT * FROM jokes_tags__tags_jokes"),
				connection_1.query("SELECT * FROM `users-permissions_user`")
			]);

			const data = {
				tags: [tags],
				users: [users],
				pages: [pages],
				comments: [comments],
				votes: [votes],
				jokes: [jokes],
				jokes_votes: [[]],  // Initialize as empty nested array
				jokes_tags: [jokesTags],
				comments_authors: [[]],
				users_roles: [[]],
				votes_authors: [[]],
				jokes_authors: [[]]
			};

			// fix jokes parameters
			data.jokes[0] = data.jokes[0].map((joke) => {
				data.jokes_authors[0].push({  // Push to the inner array
					joke_id: joke.id,
					user_id: joke.author,
				});

				renameObjectProperty(joke, "created_by", "created_by_id");
				renameObjectProperty(joke, "updated_by", "updated_by_id");
				renameObjectProperty(joke, "status", "joke_status");
				joke.document_id = createId();
				joke.created_by_id = 1;
				joke.updated_by_id = 1;

				delete joke.author;
				return joke;
			});

			// fix user parameters
			data.users[0] = data.users[0].map((user) => {
				data.users_roles[0].push({
					user_id: user.id,
					role_id: 1
				})

				delete user.role;

				if (user.adult_content == 'hide') {
					user.adult_content = 'strict';
				} else {
					user.adult_content = 'open';
				}

				user.document_id = createId();

				renameObjectProperty(user, "resetPasswordToken", "reset_password_token");
				renameObjectProperty(user, "created_by", "created_by_id");
				renameObjectProperty(user, "updated_by", "updated_by_id");
				renameObjectProperty(user, "confirmationToken", "confirmation_token");
				renameObjectProperty(user, "adult_content", "restriction");

				// combine first_name and last_name into display_name
				user.display_name = `${user.first_name} ${user.last_name}`;
				delete user.first_name;
				delete user.last_name;	

				return user;
			})

			// fix comments complicated
			data.comments[0] = data.comments[0].map((comment) => {
				if (comment.authorUser) {
					data.comments_authors[0].push({
						user_id: comment.authorUser,
						comment_id: comment.id
					})
				}

				renameObjectProperty(comment, "authorName", "author_name");
				renameObjectProperty(comment, "authorEmail", "author_email");

				comment.document_id = createId();

				const joke = data.jokes[0].find(j => j.id === parseInt(comment.relatedSlug.split(':')[1]));
				const jokeId = joke ? joke.document_id : null;
				comment.related = `api::joke.joke:${jokeId}`;
				delete comment.relatedSlug;
				delete comment.blockedThread;
				delete comment.blockReason;
				delete comment.points;
				delete comment.authorUser;
				delete comment.authorType;
				delete comment.authorId;
				delete comment.threadOf;
				delete comment.author;
				delete comment.created_by;
				delete comment.approvalStatus;
				delete comment.updated_by;
				delete comment.authorAvatar;

				return comment;
			})

			// fix tags
			data.tags[0] = data.tags[0].map((tag) => {
				if (tag.adult_content == 'hide') {
					tag.adult_content = 'strict';
				} else {
					tag.adult_content = 'open';
				}

				renameObjectProperty(tag, "adult_content", "restriction");
				renameObjectProperty(tag, "created_by", "created_by_id");
				renameObjectProperty(tag, "updated_by", "updated_by_id");
				tag.document_id = createId();

				return tag;
			})

			// fix pages
			data.pages[0] = data.pages[0].map((page) => {
				renameObjectProperty(page, "created_by", "created_by_id");
				renameObjectProperty(page, "updated_by", "updated_by_id");
				page.document_id = createId();

				return page;
			})

			// fix votes
			data.votes[0] = data.votes[0].map((vote) => {
				// Create document_id for the vote
				vote.document_id = createId();

				// Handle the author relationship based on priority:
				// 1. author field if exists
				// 2. created_by if author doesn't exist
				// 3. no author link if neither exists
				if (vote.author) {
					// Case 1: use author field for votes_authors link
					data.votes_authors[0].push({
						vote_id: vote.id,
						user_id: vote.author
					});
				} else if (vote.created_by) {
					// Case 2: use created_by for votes_authors link
					data.votes_authors[0].push({
						vote_id: vote.id,
						user_id: vote.created_by
					});
				}
				// Case 3: no author information - don't create link

				// Rename fields
				renameObjectProperty(vote, "created_by", "created_by_id");
				renameObjectProperty(vote, "updated_by", "updated_by_id");

				// Set all user reference fields to null
				vote.created_by_id = null;
				vote.updated_by_id = null;
				delete vote.author;

				return vote;
			})

			// Handle jokes__votes relationships separately
			data.jokes_votes[0] = jokesVotes.map(relation => ({
				joke_id: relation.joke_id,
				vote_id: relation.vote_id
			}));

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
				chunkAndRun(data.users[0], "up_users"),
				chunkAndRun(data.tags[0], "tags"),
			]);

			// Group 2: Content tables
			console.log('\nMigrating Content Tables:');
			console.log('Content Type          Progress                                    Stats                  Batch Info');
			console.log('─'.repeat(100));
			
			await Promise.all([
				chunkAndRun(data.jokes[0], "jokes"),
				chunkAndRun(data.pages[0], "pages"),
				chunkAndRun(data.votes[0], "votes"),
				chunkAndRun(data.comments[0], "plugin_comments_comments"),
			]);

			// Group 3: Relationship tables
			console.log('\nMigrating Relationship Tables:');
			console.log('Content Type          Progress                                    Stats                  Batch Info');
			console.log('─'.repeat(100));

			await Promise.all([
				chunkAndRun(data.jokes_authors[0], "jokes_user_lnk"),
				chunkAndRun(data.jokes_votes[0], "jokes_votes_lnk"),
				chunkAndRun(data.jokes_tags[0], "jokes_tags_lnk"),
				chunkAndRun(data.users_roles[0], "up_users_role_lnk"),
				chunkAndRun(data.votes_authors[0], "votes_author_lnk"),
				chunkAndRun(data.comments_authors[0], "plugin_comments_comments_author_user_lnk")
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
			process.exit(0);
		}
	}

	async function chunkAndRun(array: Array<any>, table_name: string, reset_table_content: boolean = false) {
		console.log(`Chunking and running ${table_name}`);
		const tableColor = getTableColor(table_name);
		
		if (reset_table_content) {
			resetTablesContent(table_name);
		}

		// Add check for empty array
		if (!array || array.length === 0) {
			console.log(chalk.yellow(`No data to process for ${table_name}`));
			return;
		}

		const firstRow = array[0];
		// Add check for undefined first row
		if (!firstRow) {
			console.log(chalk.yellow(`First row is undefined for ${table_name}`));
			return;
		}

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

		if (table_name) {
			const tableColor = getTableColor(table_name);
			console.log(`Resetting content for ${tableColor(table_name)}`);
			await connection_2.query(`Truncate table ${table_name}`);
		} else {
			for (const table of CONFIG.DATABASE.tables) {
				const tableColor = getTableColor(table);
				console.log(`Resetting content for ${tableColor(table)}`);
				await connection_2.query(`Truncate table ${table}`);
			}
		}

		await connection_2.query("SET FOREIGN_KEY_CHECKS = 1;");
		console.log(chalk.green('✓'), 'Tables content reset completed');
	}

	migrateData();
}
