require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);

module.exports.sendSMS = function(orderID, coffeeType) {
  client.messages.create({
    to: process.env.MY_PHONE_NUMBER,
    from: '+16179173800',
    body: 'Thank you :) your order of ' + coffeeType + ' is placed with ID: ' + orderID + '. With love from Twilio!'
  }).then((message) => console.log('' + message.sid));
}
