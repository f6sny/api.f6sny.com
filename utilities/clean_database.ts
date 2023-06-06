namespace JokesDatabaseCleaner {
	const mysql = require("mysql2/promise");
	const prompts = require("prompts");
	const arabicString = require("@6degrees/arabic-strings");
	require("colors");

	require("dotenv").config();

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
			// Clean joke slugs
			await clean_slugs();
		} catch (error) {
			console.error(error);
		}

		console.log("reached here");
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
