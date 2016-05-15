'use strict';
/*Dependencies*/
let chai = require('chai');
let should = chai.should();
let assert = chai.assert;
let Q = require('q');
/*File To Test:*/
let app = require('./app.js');
/*Functions to test*/
let main = app.main;
let parseVendorName = app.parseVendorName;
let checkDuplicate = app.checkDuplicate;
let categorize = app.categorize;
let addDailyTotal = app.addDailyTotal;
let calculateDailyBalances = app.calculateDailyBalances;
let printVendors = app.printVendors;
let printDuplicates = app.printDuplicates;
let printExpenseCategories = app.printExpenseCategories;
let printDailyBalances = app.printDailyBalances;

describe('main()', function () {
  it('REQUIRED FEATURE: The balance should equal the right number', Q.async(function* () {

    let testData = {
      totalCount: 3,
      page: 1,
      transactions: [
      {
        Date: '2013-12-22',
        Ledger: 'Phone & Internet Expense',
        Amount: '-110.71',
        Company: 'SHAW CABLESYSTEMS CALGARY AB',
      },
      {
        Date: '2013-12-21',
        Ledger: 'Travel Expense, Nonlocal',
        Amount: '-8.1',
        Company: 'BLACK TOP CABS VANCOUVER BC',
      },
      {
        Date: '2013-12-21',
        Ledger: 'Business Meals & Entertainment Expense',
        Amount: '-9.88',
        Company: 'GUILT & CO. VANCOUVER BC',
      }, ],
    };

    var result = yield main('testing', testData);

    result.should.equal(-128.69);

  }));
});

describe('Additional Feature 1: parseVendorName()', function () {
  var locationNames = [
     'CALGARY',
     'RICHMOND',
     'VANCOUVER',
     'MISSISSAUGA',
     'VICTORIA',
    ];
  it('Should be able to clean up a name with a city in the middle of it.', function () {
    //Sub Case 1: Vancouver
    var vendorName = 'COMMODORE LANES & BILL VANCOUVER BC';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('COMMODORE LANES & BILL');

    //Sub Case 2: Calgary
    var vendorName = 'SHAW CABLESYSTEMS CALGARY AB';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('SHAW CABLESYSTEMS');
  });

  it('Should be able to clean up a name with a city name in the beginning of it' +
   ' but shouldnt take out the city name in the beginning', function () {
    //Case 1:
    var vendorName = 'VANCOUVER TAXI VANCOUVER BC';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('VANCOUVER TAXI');
  });

  it('Should be able to clean up a name with a credit card number in it.', function () {
    var vendorName = 'DROPBOX xxxxxx8396 CA 9.99 USD @ xx1001';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('DROPBOX');
  });

  it('Should make all payment transactions look the same', function () {
    var vendorName = 'PAYMENT - THANK YOU / PAIEMENT - MERCI';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('PAYMENT');

    var vendorName = 'PAYMENT RECEIVED - THANK YOU';
    var cleanedName = parseVendorName(locationNames, vendorName);
    cleanedName.should.equal('PAYMENT');
  });

});

/*The checkDuplicate() function checks an incoming transaction against previous transactions
to determine if it is a duplicate or not.*/
describe('Additional Feature 2: checkDuplicate()', function () {
  it('Should return false if there are no transactions before the current one.', function () {
    let transactions = [];
    let element = { Amount: 23.45 };
    let duplicates = [];
    let duplicate = checkDuplicate(transactions, element, duplicates);
    //Should be false.
    duplicate.should.be.false;
  });

  it('Should return false if the amount of the current transaction is higher than all the other previous transactions (higher than upper bound)', function () {

    let transactions = [{ Amount: 1 }, { Amount: 2 }, { Amount: 3 }];
    let element = { Amount: 4 };
    let duplicates = [];

    let duplicate = checkDuplicate(transactions, element, duplicates);
    duplicate.should.be.false;
  });

  it('Should return false if the amount of the current transaction is lower than the lower bound', function () {
    let transactions = [{ Amount: 2 }, { Amount: 3 }, { Amount: 4 }];
    let element = { Amount: 1 };
    let duplicates = [];

    let duplicate = checkDuplicate(transactions, element, duplicates);
    duplicate.should.be.false;
  });

  it('Should return false if the amount is within bounds but has no corresponding transaction with same amount', function () {
    let transactions = [{ Amount: 2 }, { Amount: 3 }, { Amount: 4 }];
    let element = { Amount: 3.3 };
    let duplicates = [];

    let duplicate = checkDuplicate(transactions, element, duplicates);
    duplicate.should.be.false;
  });

  it('Should return false if the amount is within bounds, and has the same amount but if any of the transaction properties dont match.', function () {
    let transactions = [
     {
          Date: '2013-12-12',
          Ledger: 'Office Expense',
          Amount: '-42.53',
          Company: 'FEDEX xxxxx5291 MISSISSAUGA ON',
        },
        {
          Date: '2013-12-12',
          Ledger: 'Web Hosting & Services Expense',
          Amount: '-63.01',
          Company: 'GROWINGCITY.COM xxxxxx4926 BC',
        },
        {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        },
    ];
    let element = {
          //DATE IS OFF by 3 DAYS.
          Date: '2013-12-15',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        };
    let duplicates = [];

    let duplicate = checkDuplicate(transactions, element, duplicates);
    duplicate.should.be.false;
  });

  it('Should return true if the amount is within bounds, has the same amount, and all other properties match', function () {
    let transactions = [
     {
          Date: '2013-12-12',
          Ledger: 'Office Expense',
          Amount: '-42.53',
          Company: 'FEDEX xxxxx5291 MISSISSAUGA ON',
        },
        {
          Date: '2013-12-12',
          Ledger: 'Web Hosting & Services Expense',
          Amount: '-63.01',
          Company: 'GROWINGCITY.COM xxxxxx4926 BC',
        },
        {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        },
    ];
    let element = {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        };
    let duplicates = [];

    let duplicate = checkDuplicate(transactions, element, duplicates);
    duplicate.should.be.true;
  });
});

describe('Additional Feature 3: categorize()', function () {
  it('Should be able to parse the expense category from a brand new transaction & create' +
   'the list categories if none exist', function () {
    let expenseCategories = [];
    let element = {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        };

    categorize(expenseCategories, element);
    (expenseCategories[0].name).should.equal('Business Meals & Entertainment Expense');
    (expenseCategories[0].total).should.equal(-91.12);
    (expenseCategories[0].transactions[0].should.eql({
      Date: '2013-12-12',
      Ledger: 'Business Meals & Entertainment Expense',
      Amount: -91.12,
      Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
    }));
  });

  it('Should parse and add into a new category if one exists but not the same', function () {
    //One element will already be loaded into the array at start.
    let expenseCategories = [
     {
      name: 'Existing Category',
      transactions: [
       {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: -100.00,
          Company: 'PLACEHOLDER',
        },
      ],
      total: -100,
    },
    ];
    //Incoming element with a different ledger name.
    let element = {
          Date: '2013-12-12',
          Ledger: 'Completely New Category',
          Amount: '-91.12',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        };

    categorize(expenseCategories, element);
    //There should be a new expenseCategory now
    (expenseCategories.length).should.equal(2);
    //Print it out
    // printExpenseCategories(expenseCategories);
  });

  it('Should parse and add into the existing category if the same, and update the total.', function () {
    let expenseCategories = [
     {
      name: 'Business Meals & Entertainment Expense',
      total: -91.12,
      transactions: [
       {
        Date: '2013-12-12',
        Ledger: 'Business Meals & Entertainment Expense',
        Amount: -91.12,
        Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
      },
      ],
    },
    ];

    let element = {
          Date: '2013-12-12',
          Ledger: 'Business Meals & Entertainment Expense',
          Amount: '-10.00',
          Company: 'NESTERS MARKET #x0064 VANCOUVER BC',
        };

    categorize(expenseCategories, element);

    //There should still be only one element in expenseCateogories (because the new transaction
    //is the same category)
    (expenseCategories.length).should.equal(1);
    //The amount should now be $10 higher
    (expenseCategories[0].total).should.equal(-101.12);
    //There should be another transaction in that expense category now
    (expenseCategories[0].transactions.length).should.equal(2);

    // printExpenseCategories(expenseCategories);

  });
});

describe('Additional Feature 4: Calculate a running balance', function () {
  describe('4A - addDailyTotal()', function () {
    it('Should be able to create a daily balance entry if there are none', function () {
      var dailyTotals = [];
      var element = {
          Date: '2013-12-17',
          Ledger: 'Auto Expense',
          Amount: '6.23',
          Company: 'SMART CITY FOODS xxxxxx3663 BC',
        };

      dailyTotals = addDailyTotal(dailyTotals, element);

      //New entry should be created for date of element
      (dailyTotals.length).should.equal(1);
      //That entry should contain the total of the element
      (dailyTotals[0].total).should.equal(6.23);
    });

    it('Should create add to the entry if it is the same date.', function () {
      var dailyTotals = [];
      var element = {
          Date: '2013-12-17',
          Ledger: 'Auto Expense',
          Amount: '6.23',
          Company: 'SMART CITY FOODS xxxxxx3663 BC',
        };
      dailyTotals = addDailyTotal(dailyTotals, element);

      var element = {
        Date: '2013-12-17',
        Ledger: 'Insurance Expense',
        Amount: '10.00',
        Company: 'LONDON DRUGS 78 POSTAL VANCOUVER BC',
      };

      dailyTotals = addDailyTotal(dailyTotals, element);

      //There should still only be one entry in daily balances.
      (dailyTotals.length).should.equal(1);
      //The total for that day should be sum of the two transactions
      (dailyTotals[0].total).should.equal(16.23);

    });

    it('Should create a new entry if it is for a different date than what is currently there', function () {
      var dailyTotals = [];
      var element = {
          Date: '2013-12-17',
          Ledger: 'Auto Expense',
          Amount: '6.23',
          Company: 'SMART CITY FOODS xxxxxx3663 BC',
        };
      dailyTotals = addDailyTotal(dailyTotals, element);

      var element = {
        Date: '2013-12-18',
        Ledger: 'Insurance Expense',
        Amount: '-4.87',
        Company: 'LONDON DRUGS 78 POSTAL VANCOUVER BC',
      };

      dailyTotals = addDailyTotal(dailyTotals, element);
      //There should be two entries in daily balances now
      (dailyTotals.length).should.equal(2);
      //The total should be that of the expense.
      (dailyTotals[1].total).should.equal(-4.87);
    });
  });

});

describe('4B- Calculate daily running balance', function () {
  it('Should be able to calculate the running balance for each day', function () {
    var dailyTotals = [];
    dailyTotals.push({ date: '2013-12-17', total: 5.00 });
    dailyTotals.push({ date: '2013-12-18', total: 5.00 });
    dailyTotals.push({ date: '2013-12-19', total: 5.00 });

    var dailyBalances = calculateDailyBalances(dailyTotals);
    //Day 1 should just be its sum of transactions
    (dailyBalances[0].dailyBalance).should.equal(5);
    (dailyBalances[1].dailyBalance).should.equal(10);
    (dailyBalances[2].dailyBalance).should.equal(15);

    //Printing it out
    //printDailyBalances(dailyTotals);

  });
});
