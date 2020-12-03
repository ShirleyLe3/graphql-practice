const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

// Dummy data
const dummyUserId = '5fc9416d0c69785a78e6af58';
//

const app = express();

app.use(helmet());
app.use(bodyParser.json());

app.use('/graphql', graphqlHTTP({
  schema: buildSchema(`
    type Event {
      _id: ID!
      title: String!
      description: String!
      price: Float!
      date: String!
    }

    type User {
      _id: ID!
      email: String!
      password: String
    }

    input EventInput {
      title: String!
      description: String!
      price: Float!
      date: String!
    }

    input UserInput {
      email: String!
      password: String!
    }

    type RootQuery {
      events: [Event!]!
    }

    type RootMutation {
      createEvent(eventInput: EventInput): Event
      createUser(userInput: UserInput): User
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: () => {
      return Event
        .find()
        .then(events => {
          return events.map(event => {
            return { ...event._doc };
          });
        })
        .catch(err => {
          throw err;
        });
    },
    createEvent: args => {
      const event = new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: +args.eventInput.price,
        date: new Date(args.eventInput.date),
        creator: dummyUserId
      });
      let createdEvent;
      return event
        .save()
        .then(result => {
          createdEvent = { ...result._doc, _id: result.id };
          return User.findById(dummyUserId);
        })
        .then(user => {
          if (!user) {
            throw new Error(`User doesn't exist.`);
          }
          user.createdEvents.push(event)
          return user.save();
        })
        .then(result => {
          return createdEvent;
        })
        .catch(err => {
          console.log(err);
          throw err;
        });
    },
    createUser: args => {
      return User.findOne({ email: args.userInput.email })
        .then(user => {
          if (user) {
            throw new Error('User already exists.');
          }
          return bcrypt.hash(args.userInput.password, 12);
        })
        .then(hashedPassword => {
          const user = new User({
            email: args.userInput.email,
            password: hashedPassword
          });
          return user.save();
        })
        .then(result => {
          return { ...result._doc, password: null, _id: result.id };
        })
        .catch(err => {
          throw err;
        });
    }
  },
  graphiql: true
}));

mongoose
  .connect('mongodb://localhost:27017/graphql?readPreference=primary&appname=MongoDB%20Compass&ssl=false')
  .then(() => {
    console.log('\nListening...');
    app.listen(8000);
  })
  .catch(err => {
    console.log(err);
  });

