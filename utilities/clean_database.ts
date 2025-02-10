namespace JokesDatabaseCleaner {
	const mysql = require("mysql2/promise");
	const prompts = require("prompts");
	const arabicString = require("@flowdegree/arabic-strings");
	const chalk = require("chalk");
	require("dotenv").config();

	// Processing limit constant
	const PROCESS_LIMIT = 10;

	require("util").inspect.defaultOptions.depth = 1;

	var pool1 = mysql.createPool({
		connectionLimit: 300,
		host: process.env.DATABASE_HOST_OLD,
		user: process.env.DATABASE_USERNAME_OLD,
		password: process.env.DATABASE_PASSWORD_OLD,
		database: process.env.DATABASE_NAME_OLD,
	});

	let my_sql_pool_connection;

	async function clean() {
		my_sql_pool_connection = await pool1.getConnection();

		try {
			while (true) {
				const mainMenuResponse = await prompts({
					type: 'select',
					name: 'action',
					message: 'What would you like to do?',
					choices: [
						{ title: 'Clean Slugs', value: 'slugs' },
						{ title: 'Clean Jokes Without Tags', value: 'tags' },
						{ title: 'Exit', value: 'exit' }
					]
				});

				if (mainMenuResponse.action === 'exit' || !mainMenuResponse.action) {
					break;
				}

				switch (mainMenuResponse.action) {
					case 'slugs':
						await clean_slugs();
						break;
					case 'tags':
						await clean_jokes_without_tags();
						break;
				}
			}
		} catch (error) {
			console.error(error);
		}

		my_sql_pool_connection.release();
		process.exit(0);
	}

	async function clean_slugs() {
		const characters = "ًٌٍَُِِّْے~!@#$?؟ہ^!";

		let result = await my_sql_pool_connection.query(
			`SELECT * FROM jokes where slug REGEXP '[${characters}]';`
		);

		if (Array.isArray(result[0]) && result[0].length > 0) {
			// we got results, lets loop through for bunches of CHUNK_SIZE and prompt for cleaning

			let response = await prompts({
				type: "confirm",
				name: "value",
				message: `Found ${result[0].length}  results, do you want to see them ?`,
				initial: true,
			});

			if (response.value == true) {
				const CHUNK_SIZE = 100;
				const chunked_array = chunkArray(result[0], CHUNK_SIZE);

				// loop through the chunks
				for (const group of chunked_array) {
					// loop through the chunk and show original and fix, then prompt the user for fix
					let fixed_jokes_slugs_array = [];
					
					for (const item of group) {
						let string_to_clean = item.slug;
						string_to_clean = arabicString.sanitize(string_to_clean);
						string_to_clean = arabicString.removeNonArabic(string_to_clean,"-");
						string_to_clean = string_to_clean.replace("--", "-");
						fixed_jokes_slugs_array.push({
							id: item.id,
							slug: string_to_clean,
						});

						console.log(item.slug + "\t" + string_to_clean.green);
					}

					let fix_slug_response = await prompts({ 
						type: "confirm",
						name: "value",
						message: `do you want to fix them ??`,
						initial: true,
					});

					if (fix_slug_response.value == true) {
						console.log(
							"oh my god, you want to fix them 👀, ok, we will do it for you, hang tight"
						);
						//console.log(fixed_jokes_slugs_array[0]);
						await updateRecords('jokes',fixed_jokes_slugs_array);


						let continue_fix_slug_response = await prompts({
							type: "confirm",
							name: "value",
							message: `shall we continue or stop ??`,
							initial: true,
						});

						if (continue_fix_slug_response.value == false) {break;}
					} else {
						console.log("I hope you are sure about this");
					}
				}
			}
		} else {
			console.log("found nothing, moving to next check");
		}
	}

	async function clean_jokes_without_tags() {
		// First, count the jokes without tags
		const [result] = await my_sql_pool_connection.query(
			`SELECT COUNT(*) as count FROM jokes WHERE id NOT IN (SELECT joke_id FROM jokes_tags__tags_jokes) LIMIT ?`,
			[PROCESS_LIMIT]
		);

		const count = result[0].count;

		if (count === 0) {
			console.log(chalk.green("✓ All jokes have tags"));
			return;
		}

		const confirmCount = await prompts({
			type: 'confirm',
			name: 'value',
			message: `Found ${chalk.cyan(count)} jokes without tags. Would you like to process them?`,
			initial: true
		});

		if (!confirmCount.value) {
			return;
		}

		// Get all available tags
		const [tags] = await my_sql_pool_connection.query(
			`SELECT id, title FROM tags ORDER BY title ASC`
		);

		// Get the jokes without tags
		const [jokes] = await my_sql_pool_connection.query(
			`SELECT * FROM jokes WHERE id NOT IN (SELECT joke_id FROM jokes_tags__tags_jokes) LIMIT ?`,
			[PROCESS_LIMIT]
		);

		for (const joke of jokes) {
			console.log("\n" + chalk.cyan("Processing joke:"));
			console.log(chalk.cyan("ID: ") + joke.id);
			console.log(chalk.cyan("Title: ") + joke.title);
			console.log(chalk.cyan("Content: ") + joke.content + "\n");

			// Show tags selection prompt
			const tagChoices = tags.map(tag => ({
				title: tag.title,
				value: tag.id
			}));

			const tagSelection = await prompts({
				type: 'multiselect',
				name: 'selectedTags',
				optionsPerPage: 20,
				message: 'Select tags for this joke:',
				choices: tagChoices,
				hint: '- Space to select, Enter to confirm'

			});

			if (!tagSelection.selectedTags || tagSelection.selectedTags.length === 0) {
				console.log(chalk.yellow("Warning: No tags selected"));
				const confirm = await prompts({
					type: 'confirm',
					name: 'value',
					message: 'Do you want to proceed without tags?',
					initial: false
				});

				if (!confirm.value) {
					console.log(chalk.cyan("Skipping joke..."));
					continue;
				}
			}

			try {
				// Insert selected tags
				for (const tagId of tagSelection.selectedTags) {
					await my_sql_pool_connection.query(
						`INSERT INTO jokes_tags__tags_jokes (joke_id, tag_id) VALUES (?, ?)`,
						[joke.id, tagId]
					);
				}
				console.log(chalk.green("✓ Tags added successfully"));
			} catch (error) {
				console.error(chalk.red("Error adding tags:"), error);
			}
		}
	}

	function chunkArray(arr, CHUNK_SIZE) {
		let return_array = [];

		for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
			const chunk = arr.slice(i, i + CHUNK_SIZE);
			return_array.push(chunk);
		}

		return return_array;
	}

	async function updateRecords(table_name, records) {	
		for (const record of records) {
			const record_id = record.id;
			console.log(`Fixing ${table_name} record ${record_id}`)
			delete record.id;
			try {
				let result = await my_sql_pool_connection.query(
					`UPDATE ${table_name} SET ? WHERE id = ?`,
					[record, record_id]
				);
			} catch (error) {
				console.log('couldnt update it, an error occured', error.message.red)
				continue;
			}
			
		}
	}

	clean();
}
