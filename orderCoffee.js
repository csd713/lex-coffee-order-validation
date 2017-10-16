'use strict';

const lexResponses = require('./lexResponses');
const databaseManager = require('./databaseManager');
const sendOrderSMS = require('./sendOrderSMS');

const types = ['latte', 'americano', 'cappuccino', 'espresso'];
const sizes = ['double', 'normal', 'large'];

function buildValidationResult(isValid_m, violatedSlot_m, messageContent) {
  if (messageContent == null) {
    return {
      isValid: isValid_m,
      violatedSlot: violatedSlot_m,
    };
  }
  return {
    isValid: isValid_m,
    violatedSlot: violatedSlot_m,
    message: messageContent,
  };
}

function validateCoffeeOrder(coffeeType, coffeeSize) {
  if (coffeeType && types.indexOf(coffeeType.toLowerCase()) === -1) {
    //console.log('orderCoffee: Prinitng validation: ' + JSON.stringify(buildValidationResult(false, 'coffee', `We do not have ${coffeeType}, would you like a different type of coffee?  Our most popular coffee is americano.`)));
    return buildValidationResult(false, 'coffee', `We do not have ${coffeeType}, would you like a different type of coffee?  Our most popular coffee is americano.`);
  }

  if (coffeeSize && sizes.indexOf(coffeeSize.toLowerCase()) === -1) {
    return buildValidationResult(false, 'size', `We do not have ${coffeeSize}, would you like a different size of coffee? Our most popular size is normal.`);
  }

  if (coffeeType && coffeeSize) {
    //Latte and cappuccino can be normal or large
    if ((coffeeType.toLowerCase() === 'cappuccino' || coffeeType.toLowerCase() === 'latte') &&
      !(coffeeSize.toLowerCase() === 'normal' || coffeeSize.toLowerCase() === 'large')) {
      return buildValidationResult(false, 'size', `We do not have ${coffeeType} in that size. Normal or large are the available sizes for that drink.`);
    }

    //Expresso can be normal or double
    if ((coffeeType.toLowerCase() === 'espresso') &&
      !(coffeeSize.toLowerCase() === 'normal' || coffeeSize.toLowerCase() === 'double')) {
      return buildValidationResult(false, 'size', `We do not have ${coffeeType} in that size. Normal or double are the available sizes for that drink.`);
    }

    //Americano is always normal
    if ((coffeeType.toLowerCase() === 'americano') && (coffeeSize.toLowerCase() !== 'normal')) {
      return buildValidationResult(false, 'size', `We do not have ${coffeeType} in that size. Normal is the available sizes for that drink.`);
    }
  }

  return buildValidationResult(true, null, null);
}

function buildFulfillmentResult(fulfillmentState_msg, messageContent) {
  return {
    fulfillmentState: fulfillmentState_msg,
    message: {
      contentType: 'PlainText',
      content: messageContent
    }
  }
}

function fulfillOrder(coffeeType, coffeeSize) {
  console.log('orderCoffee: fulfillOrder: ' + coffeeType + ' ' + coffeeSize);

  return databaseManager.saveOrderToDatabase(coffeeType, coffeeSize).then((item) => {
    console.log('orderCoffee: printing order id: ' + item.orderId);
    //send SMS using Twilio
    sendOrderSMS.sendSMS(item.orderId, item.drink);

    return buildFulfillmentResult('Fulfilled', 'Thank you :), your order with id: ' + item.orderId + ' has been placed and will be ready soon!!\n Sent a confirmation SMS to your mobile!');
  });
}

module.exports = function(intentRequest, callback) {
  var coffeeType = intentRequest.currentIntent.slots.coffee;
  var coffeeSize = intentRequest.currentIntent.slots.size;

  console.log('orderCoffee: Printing type and size: ' + coffeeType + ' ' + coffeeSize);

  const source = intentRequest.invocationSource;
  //validating input
  if (source === 'DialogCodeHook') {

    const slots = intentRequest.currentIntent.slots;

    const validationResult = validateCoffeeOrder(coffeeType, coffeeSize);
    if (!validationResult.isValid) {
      //console.log('orderCoffee: Printing Voilated slot: ' + validationResult.violatedSlot);
      slots[`${validationResult.violatedSlot}`] = null;
      //console.log('orderCoffee: Printing elicit slot:' + JSON.stringify(lexResponses.elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message)));
      callback(lexResponses.elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));

      return;
    }
    if (coffeeSize == null) {
      intentRequest.currentIntent.slots.size = 'normal';
    }
    //console.log('orderCoffee: Printing slots: ' + JSON.stringify(intentRequest.currentIntent.slots));
    callback(lexResponses.delegate(intentRequest.sessionAttributes, intentRequest.currentIntent.slots));
    return;

  }

  if (source === 'FulfillmentCodeHook') {
    return fulfillOrder(coffeeType, coffeeSize).then(fulfilledOrder => {
      callback(lexResponses.close(intentRequest.sessionAttributes, fulfilledOrder.fulfillmentState, fulfilledOrder.message));
      return;
    });
    //    callback(lexResponses.close(intentRequest.sessionAttributes, 'Fulfilled', 'Order was placed'));
  }
}
