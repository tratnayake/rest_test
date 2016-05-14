"use strict";

/*Dependencies*/
//Q used for executing async/generator functions in ES6
var Q = require('q');
//Supertest is an easy to use library for generating API requests.
var request = require('supertest-as-promised');
//Underscore is an excellent module for manipulating arrays and collections.
var _ = require('underscore');

/*City Names*/
//TODO: Use an API to get full list of cities.
var cityNames = [
	"CALGARY",
	"RICHMOND",
	"VANCOUVER",
	"MISSISSAUGA",
	"VICTORIA"
];

/*Helper Functions*/

//This function is used to make vendor (company) names more 
//readable.
function parseCompanyName(companyName){
	//Case 1: If there is a city name, 
	//get everything before it.
	cityNames.forEach(function(element){
		let cityIndex = companyName.indexOf(element);
		//If the company name contains a city
		if( cityIndex > -1){
			//Get everything before the city name
			companyName = companyName.substr(0, cityIndex);
		}
	})

	//Case 2: If there is an xxxx, get everything before it.
	let creditCardIndex = companyName.indexOf("xxxx");
	if (creditCardIndex > -1){
		//Get everything before the credit card
		companyName = companyName.substr(0, creditCardIndex);
	}

	return companyName;
}

//This function is used to categorize and total expenses.
function categorize(expenseCategories,element){
	//If there are no expense categories, add a new one.
	// console.log("CATEGORY NAME: " + element.Ledger);
	if(expenseCategories.length < 1){
		// console.log("Less than 1..creating new");
		expenseCategories.push({
			"name":element.Ledger,
			"transactions": [element], 
			"total": parseInt(element.Amount)})
	}
	else{
		//There is more than 1 category in existence.
		//Map just the names
		var names = _.pluck(expenseCategories, "name");
		//Check if the incoming name exists
		var pos = names.indexOf(element.Ledger);
		//If the category name does not exist
		if(pos < 0){
			// console.log ("Category doesn't exist, adding new one..");
			expenseCategories.push({
				"name":element.Ledger, 
				"transactions": [element], 
				"total": parseInt(element.Amount)})
		}
		else{
			// console.log("Category does exist..adding to existing...")
			var categoryElement = expenseCategories[pos];
			categoryElement.transactions.push(element);
			categoryElement.total += parseInt(element.Amount);
		}
	}
}


function addDailyBalance(dailyBalances,element){
	//Check if empty.
	try{
		if(dailyBalances.length < 1){
			//Create a new holder
			//console.log("Empty so adding new...")
			dailyBalances.push({
				"date":element.Date, 
				"Total": parseInt(element.Amount)});
		}
		else{
			//Not Empty
			//Check to see if theres already a dailyBalance entry
			var dates = _.pluck(dailyBalances,"date");
			//console.log(dates);
			var pos = dates.indexOf(element.Date);
			//console.log(pos);
			if(pos < 0){
				//console.log("No other exists..")
				dailyBalances.push({
					"date":element.Date, 
					"Total": parseInt(element.Amount)});
			}
			else{

				var dB = dailyBalances[pos];
				dB.Total += parseInt(element.Amount);
			}
		}
	}
	catch(e){
		console.log(e);
	}
}


//MAIN Method
var main  = Q.async(function* (){ 
	console.log("Getting Transactions...");
	var totalCount = 1
	var page = 1;
	var transactions = [];
	var balance = 0;
	var expenseCategories = [];
	var dailyBalances = [];

	while (transactions.length < totalCount){
		//Send the first query
		let response = yield request("http://resttest.bench.co")
			.get("/transactions/" + page + ".json")
			.expect(200);
		//Update the total count & increase the page number.
		totalCount = response.body.totalCount;
		page++;

		//Add to transactions
		response.body.transactions.forEach(Q.async(function* (element, index, array){
			//1. Add to balance
			balance += parseInt(element.Amount);
			//2. Clean up transaction names.
			element.Company = parseCompanyName(element.Company);
			//3. Add to categories
			categorize(expenseCategories,element);
			//4. Add to daily balances
			addDailyBalance(dailyBalances,element);
			//Add to transactions
			transactions.push(element)
		}))
	}
	console.log("BALANCE: " + "$" + balance);
	//console.log(transactions);
	//console.log(expenseCategories);
	//console.log(dailyBalances);
});

main();