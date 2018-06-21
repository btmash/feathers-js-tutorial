const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const errors = require('@feathersjs/errors');

// THIS IS FOR CONNECTING TO THE SQL DATABASE
const Sequelize = require('sequelize');
const dbservice = require('feathers-sequelize');

const db = new Sequelize('feathers', 'feathersuser', 'feathers_Passw0rd', {
  host: '0.0.0.0',
  port: '33066',
  dialect: 'mysql',
  pool: {
    max: 2,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
});
const Message = db.define('message', {
  text: {
    type: Sequelize.STRING,
    allowNull: false
  },
  counter: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
  updatedAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
  patchedAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
});

// This creates an app that is both, an Express and Feathers app
const app = express(feathers());

const setTimestamp = names => {
  return async context => {
    if (typeof names == 'string') {
      context.data[names] = new Date();
    }
    else if (Array.isArray(names)) {
      let date = new Date();
      for (let name of names) {
        context.data[name] = date;
      }
    }

    return context;
  }
}

const validate = async context => {
  const { data } = context;

  // Check if there is `text` property
  if(data.text === null || data.text === undefined) {
    throw new errors.BadRequest('Message text must exist');
  }

  // Check if it is a string and not just whitespace
  if(typeof data.text !== 'string' || data.text.trim() === '') {
    throw new errors.BadRequest('Message text is invalid');
  }

  // Change the data to be only the text
  // This prevents people from adding other properties to our database
  context.data = {
    text: data.text.toString(),
    counter: data.counter
  }

  return context;
};

const messageHooks = {
  before: {
    create: [
      validate,
      setTimestamp(['createdAt', 'patchedAt', 'updatedAt'])
    ],
    patch: setTimestamp('patchedAt'),
    update: setTimestamp('updatedAt'),
    find: [],
    get: [],
    all: []
  },
  after: {
    all: [],
    find: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }
}

// Turn on JSON body parsing for REST services
app.use(express.json())
// Turn on URL-encoded body parsing for REST services
app.use(express.urlencoded({ extended: true }));
// Set up REST transport using Express
app.configure(express.rest());

// Initialize the messages service by creating
// a new instance of our class
app.use('/messages', dbservice({
  Model: Message,
  paginate: {
    default: 5,
    max: 10
  }
}));

// Lets add some middleware
app.service('messages').hooks(messageHooks);

// This is our application layer middleware for all services
app.hooks({
  error: async context => {
    console.error(`OH CRAP!!!!!!!!! Error in '${context.path}' service method '${context.method}'`, context.error.stack);
  }
});

// Set up an error handler that gives us nicer errors
app.use(express.errorHandler());

// Start the server on port 3030
const server = app.listen(3030);

/*
  Use the service to create a new message on the server.
  Note that this will attempt to recreate the db table if it
  does not exist (specified by force: false). With that
  in mind, we need to see what happens if we decide to
  add new columns to an existing model.
*/
Message.sync({ force: false }).then(() => {
  // Create a dummy Message
  app.service('messages').create({
    text: 'Message created on server',
    counter: 1
  }).then(message => console.log('Created message', message));
  createAndFind();
});

async function createAndFind() {
  // Stores a reference to the messages service so we don't have to call it all the time
  const messages = app.service('messages');

  for(let counter = 2; counter < 102; counter++) {
    await messages.create({
      counter,
      text: `Message number ${counter}`
    });
  }

  // We show 10 entries by default. By skipping 10 we go to page 2
  const page2 = await messages.find({
    query: { $skip: 10 }
  });

  console.log('Page number 2', page2);

  // Show 20 items per page
  const largePage = await messages.find({
    query: { $limit: 20 }
  });

  console.log('20 items', largePage);

  // Find the first 10 items with counter greater 50 and less than 70
  const counterList = await messages.find({
    query: {
      counter: { $gt: 50, $lt: 70 },
      $sort: {
        counter: 1,
        id: -1
      }
    }
  });

  console.log('Counter greater 50 and less than 70', counterList);

  // Find all entries with text "Message number 20"
  const message20 = await messages.find({
    query: {
      text: 'Message number 20'
    }
  });

  console.log('Entries with text "Message number 20"', message20);
}

server.on('listening', () => console.log('Feathers REST API started at http://localhost:3030'));
