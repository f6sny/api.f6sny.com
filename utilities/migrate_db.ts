namespace JokesDatabaseCleaner {
	// Dependencies
	const mysql = require("mysql2/promise");
	const chalk = require('chalk');
	const cliProgress = require('cli-progress');
	const Table = require('cli-table3');
	const { createId } = require('@paralleldrive/cuid2');
	require('dotenv').config();
	require('util').inspect.defaultOptions.depth = 1;

	// Configuration options
	const CONFIG = {
		CHUNK_SIZE: 500, // Single chunk size for all operations
		
		DATABASE: {
			connectionLimit: 300,
			tables: [
				'pages',
				'up_users',
				'tags',
				'jokes',
				'plugin_comments_comments',
				'plugin_comments_comments_author_user_lnk',
				'jokes_author_lnk',
				'jokes_tags_lnk',
				'up_users_role_lnk',
				'votes',
				'votes_joke_lnk',
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
		'jokes_author_lnk': chalk.greenBright,
		'jokes_tags_lnk': chalk.blueBright,
		'votes_joke_lnk': chalk.magentaBright,
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

	async function setupAdministratorRole() {
		console.log(chalk.cyan('\nSetting up administrator role...'));
		
		try {
			// Reset up_roles table
			// query for id 3 and delete all rows
			await connection_2.query('DELETE FROM up_roles WHERE id = 3');
			

			// reset up_permissions_role_lnk table
			// query for id 3 and delete all rows
			await connection_2.query('DELETE FROM up_permissions_role_lnk WHERE role_id = 3');

			// create a document_id for the role
			const document_id = createId();

			// Add administrator role
			const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
			await connection_2.query(`
				INSERT INTO up_roles (id, name, description, type, created_at, updated_at, published_at, document_id)
				VALUES (3, 'Administrator', 'Moderators and admins with delete and mass update abilities', 'administrator', ?, ?, ?, ?)
			`, [now, now, now, document_id]);
			
			console.log(chalk.green('✓ Administrator role created'));

			// Get all permission IDs
			const [permissions] = await connection_2.query('SELECT id FROM up_permissions');
			console.log(chalk.cyan(`Found ${permissions.length} permissions to assign`));

			// Add permissions to role
			if (permissions.length > 0) {
				const values = permissions.map(p => `(${p.id}, 3)`).join(',');
				await connection_2.query(`
					INSERT INTO up_permissions_role_lnk (permission_id, role_id)
					VALUES ${values}
				`);
				console.log(chalk.green('✓ Permissions assigned to administrator role'));
			}

			console.log(chalk.green('✓ Administrator role setup completed'));
		} catch (error) {
			console.error(chalk.red('Error setting up administrator role:'), error);
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
			
			// Setup administrator role
			await setupAdministratorRole();

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
				const processedJoke = {
					...joke,
					document_id: createId(),
					published_at: new Date(joke.updated_at),
					created_by_id: 1,
					updated_by_id: 1,
					joke_status: joke.status || 'pending'
				};

				// Create author relationship
				if (joke.author) {
					data.jokes_authors[0].push({
						joke_id: joke.id,
						user_id: joke.author
					});
				}

				// Rename properties
				renameObjectProperty(processedJoke, "status", "joke_status");
				delete processedJoke.created_by;
				delete processedJoke.updated_by;
				

				// Ensure dates are proper Date objects
				if (typeof processedJoke.updated_at === 'string') {
					processedJoke.updated_at = new Date(processedJoke.updated_at);
				}
				if (typeof processedJoke.created_at === 'string') {
					processedJoke.created_at = new Date(processedJoke.created_at);
				}

				// Remove old fields
				delete processedJoke.author;

				return processedJoke;
			});

			// fix user parameters
			data.users[0] = data.users[0].map((user) => {
				const processedUser = {
					...user,
					document_id: createId(),
					published_at: new Date(user.updated_at),
					created_by_id: 1,
					updated_by_id: 1,
					locale: null,
					restriction: user.adult_content === 'hide' ? 'strict' : 'open',
					display_name: `${user.first_name} ${user.last_name}`
				};

				// Create role relationship
				data.users_roles[0].push({
					user_id: user.id,
					role_id: user.role
				});

				// Rename properties
				renameObjectProperty(processedUser, "resetPasswordToken", "reset_password_token");
				renameObjectProperty(processedUser, "created_by", "created_by_id");
				renameObjectProperty(processedUser, "updated_by", "updated_by_id");
				renameObjectProperty(processedUser, "confirmationToken", "confirmation_token");
				renameObjectProperty(processedUser, "adult_content", "restriction");

				// Ensure dates are proper Date objects
				if (typeof processedUser.updated_at === 'string') {
					processedUser.updated_at = new Date(processedUser.updated_at);
				}
				if (typeof processedUser.created_at === 'string') {
					processedUser.created_at = new Date(processedUser.created_at);
				}

				// Remove old fields
				delete processedUser.role;
				delete processedUser.first_name;
				delete processedUser.last_name;

				return processedUser;
			})


			function hashStringToInt(str: string): number {
				let hash = 0;
				for (let i = 0; i < str.length; i++) {
				  hash = ((hash << 5) - hash) + str.charCodeAt(i); // shifting and adding char codes
				  hash |= 0; // Convert to 32-bit integer
				}
				return hash;
			  }
			  

			// fix comments complicated
			data.comments[0] = data.comments[0].map((comment) => {
				const processedComment = {
					...comment,
					document_id: createId(),
					published_at: new Date(comment.updated_at),
					blocked: 0,
					blocked_thread: 0,
					author_name: null,
					author_email: null,
					author_id: null,
					is_admin_comment: null // Default to false
				};

				// Handle authorUser relationship
				if (comment.authorUser) {
					// Find the user in users array
					const user = data.users_roles[0].find(u => u.user_id === comment.authorUser);
					
					// Set is_admin_comment if user has role 3
					if (user && user.role_id === 3) {
						processedComment.is_admin_comment = 1;
					}

					data.comments_authors[0].push({
						user_id: comment.authorUser,
						comment_id: comment.id
					});
					// Null out guest fields when we have an authenticated user
					processedComment.author_name = null;
					processedComment.author_email = null;
				} else if (comment.authorEmail) {
					// Generate author_id from email for guest comments
					processedComment.author_id = Math.abs(hashStringToInt(comment.authorEmail));
					processedComment.author_email = comment.authorEmail;
					
					// Set author_name to either existing name or email username
					processedComment.author_name = comment.authorName || comment.authorEmail.split('@')[0];
				}

				// Handle joke relationship
				const joke = data.jokes[0].find(j => j.id === parseInt(comment.relatedSlug.split(':')[1]));
				processedComment.related = joke ? `api::joke.joke:${joke.document_id}` : null;

				// Remove old fields
				delete processedComment.relatedSlug;
				delete processedComment.blockedThread;
				delete processedComment.blockReason;
				delete processedComment.points;
				delete processedComment.authorUser;
				delete processedComment.authorType;
				delete processedComment.authorId;
				delete processedComment.threadOf;
				delete processedComment.author;
				delete processedComment.created_by;
				delete processedComment.approvalStatus;
				delete processedComment.updated_by;
				delete processedComment.authorAvatar;
				delete processedComment.authorName;
				delete processedComment.authorEmail;

				return processedComment;
			})

			// fix tags
			data.tags[0] = data.tags[0].map((tag) => {
				const processedTag = {
					...tag,
					adult_content: tag.adult_content ? 'strict' : 'open',
					document_id: createId(),
					published_at: new Date(tag.updated_at), // Ensure it's a proper Date object
					created_by_id: 1,
					updated_by_id: 1,
					locale: null
				};

				// Rename properties
				renameObjectProperty(processedTag, "adult_content", "restriction");
				renameObjectProperty(processedTag, "created_by", "created_by_id");
				renameObjectProperty(processedTag, "updated_by", "updated_by_id");

				// Ensure dates are proper Date objects
				if (typeof processedTag.updated_at === 'string') {
					processedTag.updated_at = new Date(processedTag.updated_at);
				}
				if (typeof processedTag.created_at === 'string') {
					processedTag.created_at = new Date(processedTag.created_at);
				}

				return processedTag;
			})

			// fix pages
			data.pages[0] = data.pages[0].map((page) => {
				renameObjectProperty(page, "created_by", "created_by_id");
				renameObjectProperty(page, "updated_by", "updated_by_id");
				page.document_id = createId();
				page.published_at = page.updated_at;
				page.created_by_id = 1;
				page.updated_by_id = 1;

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
				vote.published_at = vote.updated_at;
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
				chunkAndRun(data.jokes_authors[0], "jokes_author_lnk"),
				chunkAndRun(data.jokes_votes[0], "votes_joke_lnk"),
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

		if (!array || array.length === 0) {
			console.log(chalk.yellow(`No data to process for ${table_name}`));
			return;
		}

		const firstRow = array[0];
		if (!firstRow) {
			console.log(chalk.yellow(`First row is undefined for ${table_name}`));
			return;
		}

		const columns = Object.keys(firstRow);
		const placeholders = columns.map(() => '?').join(', ');
		const columnsList = columns.join(', ');
		const sql_statement = `INSERT INTO \`${table_name}\` (${columnsList}) VALUES (${placeholders})`;
		
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
				const valuesToInsert = [];

				for (const data of chunk) {
					const rowValues = columns.map(col => {
						// Handle null values and undefined
						if (data[col] === undefined || data[col] === null) return null;
						
						// Convert Date objects to MySQL datetime format
						if (data[col] instanceof Date) {
							return data[col].toISOString().slice(0, 19).replace('T', ' ');
						}
						
						// Handle string values - escape special characters and line breaks
						if (typeof data[col] === 'string') {
							return data[col]
								.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
									switch (char) {
										case "\0":
											return "\\0";
										case "\x08":
											return "\\b";
										case "\x09":
											return "\\t";
										case "\x1a":
											return "\\z";
										case "\n":
											return "\\n";
										case "\r":
											return "\\r";
										case "\"":
										case "'":
										case "\\":
										case "%":
											return "\\" + char; // prepends a backslash to backslash, percent, and double/single quotes
										default:
											return char;
									}
								});
						}
						
						// Return other types as is
						return data[col];
					});
					valuesToInsert.push(rowValues);
				}

				if (valuesToInsert.length > 0) {
					let insertQuery: string; // Declare outside try block
					try {
						const batchConnection = await pool2.getConnection();
						try {
							// Build the query with properly escaped values
							const values = valuesToInsert.map(row => 
								`(${row.map(val => 
									val === null ? 'NULL' : 
									typeof val === 'string' ? `'${val}'` : 
									val
								).join(',')})`
							).join(',');
							
							insertQuery = `INSERT INTO \`${table_name}\` (${columnsList}) VALUES ${values}`;
							
							// For debugging
							if (table_name === 'jokes') {
								//console.log('First row being inserted:', JSON.stringify(valuesToInsert[0], null, 2));
							}
							
							await batchConnection.query(insertQuery);
						} finally {
							batchConnection.release();
						}
					} catch (batchError) {
						console.error(`\nError inserting batch into ${tableColor(table_name)}:`, batchError);
						console.log("Full error details:", JSON.stringify(batchError, null, 2));
						console.log("Problem query:", insertQuery?.substring(0, 1000) + '...');
						throw batchError;
					}
				}

				progressBar.update(i + chunk.length, { batch: `${count}/${totalBatches}` });
				count++;
			}

			progressBar.update(array.length, { batch: `${totalBatches}/${totalBatches}` });
		} catch (error) {
			console.error(`\nError in chunkAndRun for ${tableColor(table_name)}:`, error);
			throw error;
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
