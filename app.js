'use strict';
/*
BENCH.CO Coding Challenge Attempt
Code written by: Thilina Ratnayake (@tratnayake)
 */

/*
 --- The top section of this file is mainly helper functions. 
 --- Head to the main() @ the bottom to see where the magic happens.
 */

/*Dependencies*/
//Q used for executing async/generator functions in ES6
var Q = require('q');
//Supertest is an easy to use library for generating API requests.
var request = require('supertest-as-promised');
//Underscore is an excellent module for manipulating arrays and collections.
var _ = require('underscore');
//cli-table was used to display the results of each feature in a more organized
// fashion.
var Table = require('cli-table');
//fs used for reading the test json file
var fs = require('fs');


/*Helper Functions*/
//Binary search. Credit, code found on:
//http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
Array.prototype.binaryIndexOf = function (searchElement) {
  'use strict';
  var minIndex = 0;
  var maxIndex = this.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = this[currentIndex];

    if (currentElement < searchElement) {
      minIndex = currentIndex + 1;
    } else if (currentElement > searchElement) {
      maxIndex = currentIndex - 1;
    } else {
      return currentIndex;
    }
  }

  return -1;
};

/**
 * @param  {array} locationNames - An array containing city names that will be
 * used for cleaning up the vendor names.
 * @param  {string} vendorName - The current vendor name that is being cleaned
 * up.
 * @return {string} vendorName - A cleaned up vendor name.
 */
function parseVendorName(locationNames, vendorName) {
  //Case 1: If there is a city name,
  //get everything before it.
  locationNames.forEach(function (element) {
    let locationIndex = vendorName.indexOf(element);
    let header = 0;

    //If the first word is the city
    if (locationIndex == 0) {
      //Pass by the first ocurrence of the word and check
      //if the city occurs after that occurrence
      locationIndex = vendorName.substr(element.length + 1).indexOf(element);
      //The length of the first word becomes the header
      header = element.length + 1;
      //If the company name contains a city
    }
    //If the city occurs within the vendor name
    if (locationIndex > -1) {
      //Get everything before the city name
      //Include the first word if the first word is the city.
      vendorName = vendorName.substr(0, locationIndex + header - 1);
    }
  });
  //Case 2: If there is an xxxx, get everything before it.
  let creditCardIndex = vendorName.indexOf('xxxx');
  if (creditCardIndex > -1) {
    //Get everything before the credit card
    vendorName = vendorName.substr(0, creditCardIndex - 1);
  }

  //Case 3: If the vendor is just a payment
  if (vendorName.indexOf('PAYMENT') == 0) {
    vendorName = 'PAYMENT';
  }

  return vendorName;
}

/**
 * Checks a new transaction against all previous transactions to determine if its
 * a duplicate.
 * @param  {array} transactions - All the transactions that have currently been
 * recorded.
 * @param  {object} element - The current transaction that is being checked.
 * @param  {array} duplicates - Where duplicate entries are stored for later
 * printing.
 * @return {boolean} - Returns true if the current transaction is a duplicate of
 *  another.
 */
function checkDuplicate(transactions, element, duplicates) {
  //NOTE: Transactions are already sorted by amount.
  //CASE 1: EMPTY TRANSACTIONS
  if (transactions.length < 1) {
    //Transactions empty, not duplicate;
    return false;
  }

  //CASE 2: HIGHER/LOWER THAN MIN/MAX
  if (element.Amount > transactions[transactions.length - 1].Amount) {
    return false;
  } else if (element.Amount < transactions[0].Amount) {
    return false;

  //CASE 3: WITHIN BOUNDS
  } else {
    //Within range..checking duplicate
    //Flatten transactions into amounts
    var transactionAmounts = _.sortBy(_.pluck(transactions, 'Amount'));

    var index = transactionAmounts.binaryIndexOf(element.Amount);
    if (index >= 0) {
      transactions = _.sortBy(transactions, 'Amount');
      //TODO: There's gotta be a better way to check if two objects are the same.
      //yet, Object.is() doesn't seem to work :(
      if (JSON.stringify(transactions[index]) == JSON.stringify(element)) {
        duplicates.push(element);
        return true;
      } else {
        return false;
      }

    } else {
      return false;
    }
  }
}

/**
 * Takes in a list of expenseCategories and a transaction. With each transaction,
 * determines which category it belongs to and adds an entry to the list.
 * @param  {array} expenseCategories - An array of expense objects.
 * @param  {element} element - The transaction that will be used to parse
 * an expense category.
 * @return {[type]}
 */
function categorize(expenseCategories, element) {
  //Parse to float right away.
  element.Amount = parseFloat(element.Amount);
  //If there are no expense categories, add a new one.
  if (expenseCategories.length < 1) {
    expenseCategories.push({
      name: element.Ledger,
      transactions: [element],
      total: element.Amount, });
  }
  //There is more than 1 category in existence.
  else {
    //Map just the names
    var names = _.pluck(expenseCategories, 'name');
    //Check if the incoming name exists
    var pos = names.indexOf(element.Ledger);
    //If the category name does not exist
    if (pos < 0) {
      // adding new one..
      expenseCategories.push({
        name: element.Ledger,
        transactions: [element],
        total: element.Amount, });
    } else {
      //Category does exist..adding to existing...
      var categoryElement = expenseCategories[pos];
      categoryElement.transactions.push(element);
      categoryElement.total += element.Amount;
    }
  }
}

/**
 * @param {array} dailyTotals - An array holding the date and running total
 * for each day.
 * @param {element} element - The current element that is being analyzed
 * to update the dailyTotals.
 */
function addDailyTotal(dailyTotals, element) {
  //Parse to float just in case
  element.Amount = parseFloat(element.Amount);
  //Check if empty.
  if (dailyTotals.length < 1) {
    //Create a new holder
    //Empty so adding new...
    dailyTotals.push({
      date: element.Date,
      total: element.Amount, });
  }
  //Not empty
  else {
    //Sort the daily balances first
    // -- Had to create a new variable, because doing it directly
    // on dailybalances dereferences it preventing me from
    // pushing to it later.
    dailyTotals = _.sortBy(dailyTotals, 'date');
    //Check to see if theres already a dailyTotal entry
    var dates = _.pluck(dailyTotals, 'date');
    //sort the dates as well, so the key will correspond to the dailyTotals
    dates = _.sortBy(dates);
    var pos = dates.indexOf(element.Date);
    if (pos < 0) {
      dailyTotals.push({
        date: element.Date,
        total: element.Amount,
      });
    } else if (pos >= 0) {
      dailyTotals[pos].total += element.Amount;
    }
  }

  return dailyTotals;
}

/*Print Helpers*/
/** Helper function to find unique vendor names and print them to a table.
 * @param  {array} transactions - An array of transactions that a list of
 * vendors will be compiled from.
 */
function printVendors(transactions) {
  //For all transactions, map the vendor names.
  let vendors = _.uniq(_.pluck(transactions, 'Company'));
  var table = new Table();
  vendors.forEach(function (element) {
    table.push({ Vendor: element });
  });

  console.log(table.toString());
}

/**
 * Helper function to print identified duplicates to a table.
 * @param  {array} duplicates - Holds all identified duplicates.
 * @return {[type]}
 */
function printDuplicates(duplicates) {
  var table = new Table({
      head: ['Company', 'Date', 'Amount'],
    });

  duplicates.forEach(function (element) {
    table.push(
     [element.Company, element.Date, '$' + Math.abs(element.Amount)]
    );
  });

  console.log(table.toString());

}

/**
 * Helper function to print expense categories and their totals along with
 * associated transactions.
 * @param  {array} categories - Array of category objects containing a name and
 * total.
 */
function printExpenseCategories(categories) {
  categories.forEach(function (element) {
    console.log('Category: ' + element.name);
    console.log('Total Spent: $' + Math.abs(element.total).toFixed(2));

    var table = new Table({
      head: ['Company', 'Date', 'Amount'],
    });

    //Sort the transactions by date.
    element.transactions = _.sortBy(element.transactions, 'Date');
    element.transactions.forEach(function (transaction) {
      table.push(
        [transaction.Company, transaction.Date, '$'
        	+ Math.abs(transaction.Amount), ]
      );
    });

    console.log(table.toString());
  });
}


/**
 * @param  {array} dailyTotals - Contains the totals of transactions for each day.
 * @return {[type]}
 */
function calculateDailyBalances(dailyTotals) {
  let dailyBalances = [];

  dailyTotals.forEach(function (element, index, totals) {
    //Skip if its the first one
    if (index == 0) {
      //The daily balance for the first day will merely be its total.
      dailyBalances.push(
       { date: element.date, dailyBalance: element.total }
      );
    } else if (index > 0) {
      //Add to daily balance, the current day
      var dailyBalance = element.total;
      // summed with the balance of the previous day.
      var previousDay = dailyBalances[dailyBalances.length - 1].dailyBalance;
      dailyBalance += previousDay;
      dailyBalances.push(
       { date: element.date, dailyBalance: dailyBalance }
      );
    }
  });

  return dailyBalances;
}
/**
 * @param  {array} dailyTotals - An array of dailyTotal objects. Contains
 * a Date and Total.
 * @return {[type]}
 */
function printDailyBalances(dailyTotals) {
  //First calculate the dailyBalances
  var dailyBalances = calculateDailyBalances(dailyTotals);
  //Sort the balances by date.
  dailyBalances = _.sortBy(dailyBalances, 'date');
  var table = new Table({
      head: ['Date', 'Total'],
    });

  dailyBalances.forEach(function (element) {
    //Format the balance
    if (element.dailyBalance < 0) {
      element.dailyBalance = '-$' + Math.abs(element.dailyBalance.toFixed(2));
    } else {
      element.dailyBalance = '$' + element.dailyBalance.toFixed(2);
    }

    table.push(
     [element.date, element.dailyBalance]
    );
  });

  console.log(table.toString());
}



/*MAIN Method*/
/**
 * @param {string} - mode. Either "production" or "testing". Production
 * means that it  (1) queries the resttest API for data and (2) prints
 * all the results to console. Testing means that it takes in testData
 * and doesn't print to console.
 * @param {object} - testData. Transactions that will be fed in for testing
 * purposes.
 *
 */
var main = Q.async(function* (mode, testData) {

  //variables
  var totalCount = 1;
  var page = 1;
  var transactions = [];
  var balance = 0;
  var expenseCategories = [];
  var dailyTotals = [];
  var duplicates = [];
  var elementCounter = 0;

  //TODO: Use an API to get full list of cities.
  let locationNames = [
  	'CALGARY',
  	'RICHMOND',
  	'VANCOUVER',
  	'MISSISSAUGA',
  	'VICTORIA',
  ];

  //Taking the Functional Programming (FP) approach
  //We will be querying for transactions, and performing operations
  //on the data AS we get them.
  while (elementCounter <= totalCount - 1) {

    if (mode == 'testing') {
      var response = {};
      response.body = testData;
    } else {
      //Send the first query
      var response = yield request('http://resttest.bench.co')
       .get('/transactions/' + page + '.json')
       .expect(200);
    }

    totalCount = response.body.totalCount;
    page++;

    response.body.transactions.forEach(function (element, index, array) {

      //0 Clean up transaction names. Do this first because it'll be needed later anyways
      element.Company = parseVendorName(locationNames, element.Company);
      //Parse float where we can
      element.Amount = parseFloat(element.Amount);
      elementCounter++;
      var duplicate = checkDuplicate(transactions, element, duplicates);
      if (!duplicate) {
        //1. Add to balance
        balance += element.Amount;
        //3. Add to categories
        categorize(expenseCategories, element);
        //4. Add to daily balances
        dailyTotals = addDailyTotal(dailyTotals, element);
        //Add to transactions
        transactions.push(element);

      }
    });

  };

  //Only print out all to console.log if this is running in production.
  if (mode == 'production') {
    console.log('(MAIN REQUIREMENT) Balance: ' + '$' + balance);
    console.log('(Additional Requirement 1) Cleaned Up Vendor Names: ');
    printVendors(transactions);
    console.log('(Additional Requirement 2) Removed Duplicates');
    printDuplicates(duplicates);
    console.log('(Additional Requirement 3) List Expense Categories ');
    printExpenseCategories(expenseCategories);
    console.log('(Additional Requirement 4) List Daily Balances ');
    printDailyBalances(dailyTotals);
  }

  return balance;
});


//Main takes in two variables, the mode [production | testing] & testData.
main('production');

/*Export functions for testing.*/
exports.main = main;
exports.parseVendorName = parseVendorName;
exports.checkDuplicate = checkDuplicate;
exports.categorize = categorize;
exports.addDailyTotal = addDailyTotal;
exports.calculateDailyBalances = calculateDailyBalances;
//Export the print methods for testing as well
exports.printVendors = printVendors;
exports.printDuplicates = printDuplicates;
exports.printExpenseCategories = printExpenseCategories;
exports.printDailyBalances = printDailyBalances;
