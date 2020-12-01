const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const app = express();

app.use(helmet());
app.use(bodyParser.json());

app.use('/graphql', graphqlHTTP({
  schema: buildSchema(`
    type RootQuery {
      events: [String!]!
    }

    type RootMutation {
      createEvent(name: String): String
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: () => {
      return ['Cooking', 'Sailing', 'Coding']
    },
    createEvent: (args) => {
      const eventName = args.name;
      return eventName;
    }
  }
}));

app.listen(8000);