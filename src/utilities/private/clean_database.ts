var mysql = require("mysql2/promise");
const prompts = require('prompts');
const arabicString = require('@6degrees/arabic-strings');
require('dotenv').config();
require('util').inspect.defaultOptions.depth = 1;

async function main() {
	console.log('creating sql connection pool')
	const pool1 = mysql.createPool({
		connectionLimit: 300,
		host: process.env.DATABASE_HOST_OLD,
		user: process.env.DATABASE_USERNAME_OLD,
		password: process.env.DATABASE_PASSWORD_OLD,
		database: process.env.DATABASE_NAME_OLD,
	});
	console.log('connecting to the')
	let mycon = await pool1.getConnection();
	
	try {
		// Clean joke slugs
		const characters = 'ًٌٍَُِِّْے~!@#$?؟ہ^!';

		let result = await mycon.query(`SELECT * FROM jokes where slug REGEXP '[${characters}]';`);
		
		if(result[0].length>0){
			let response = await prompts({
				type: 'confirm',
				name: 'value',
				message: `Found ${result[0].length}  results, do you want to see them ?`,
				initial: true
			  });
			  
			  if(response.value == true){

				for(let i =0; i <= 20; i++){
					let mystr = result[0][i].slug;
					console.log(mystr);

					mystr = arabicString.sanitize(mystr);
					mystr = arabicString.removeNonArabic(mystr, "-");
					mystr = mystr.replace('--','-');
					console.log(mystr + '\r\n')
				}

			  }

			  response = await prompts({
				type: 'confirm',
				name: 'value',
				message: `do you want to fix them ?`,
				initial: true
			  });

			  console.log('oh my god, you want to fix them 👀');
		}
		else{
			console.log('found nothing, moving to next check')
		}
		  
		   
	} 
	catch (error) {
		console.error(error);
	}

	console.log('reached here')
	process.exit(0);

}

main();