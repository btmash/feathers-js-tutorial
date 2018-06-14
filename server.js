const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');

// This creates an app that is both, an Express and Feathers app
const app = express(feathers());

// Main service class
class Messages {
  constructor() {
    this.messages = [];
    this.currentId = 0;
  }

  async find(params) {
    // Return the list of all messages
    return this.messages;
  }

  async get(id, params) {
    // Find the message by id
    const message = this.messages.find(message => message.id === parseInt(id, 10));

    // Throw an error if it wasn't found
    if(!message) {
      throw new Error(`Message with id ${id} not found`);
    }

    // Otherwise return the message
    return message;
  }

  async create(data, params) {
    // Create a new object with the original data and an id
    // taken from the incrementing `currentId` counter
    const message = Object.assign({
      id: ++this.currentId,
    }, data);

    this.messages.push(message);

    return message;
  }

  async patch(id, data, params) {
    // Get the existing message. Will throw an error if not found
    const message = await this.get(id);

    // Merge the existing message with the new data
    // and return the result
    return Object.assign(message, data);
  }

  async remove(id, params) {
    // Get the message by id (will throw an error if not found)
    const message = await this.get(id);
    // Find the index of the message in our message array
    const index = this.messages.indexOf(message);

    // Remove the found message from our array
    this.messages.splice(index, 1);

    // Return the removed message
    return message;
  }
}

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
    text: data.text.toString()
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
app.use('messages', new Messages());

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

// Use the service to create a new message on the server
app.service('messages').create({
  text: 'Hello from the server'
});

server.on('listening', () => console.log('Feathers REST API started at http://localhost:3030'));
