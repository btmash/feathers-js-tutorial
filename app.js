const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const app = feathers();

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

// Initialize the messages service by creating
// a new instance of our class
app.use('messages', new Messages());

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

// Lets add some middleware
app.service('messages').hooks(messageHooks);

// This is our application layer middleware for all services
app.hooks({
  error: async context => {
    console.error(`OH CRAP!!!!!!!!! Error in '${context.path}' service method '${context.method}'`, context.error.stack);
  }
});

async function processMessages() {
  await app.service('messages').create({
    text: 'First message'
  });

  await app.service('messages').create({
    text: 'Second message'
  });

  await app.service('messages').patch(1, {
    revision_text: 'This is my updated first message',
    revision: 'I updated this message, yo'
  });

  const messageList = await app.service('messages').find();

  console.log('Available messages', messageList);
}

async function processMessagesSubscribers() {
  app.service('messages').on('created', message => {
    console.log('Created a new message', message);
  });

  app.service('messages').on('created', message => {
    console.log('Lets send an email about this one', message);
  });

  app.service('messages').on('removed', message => {
    console.log('Deleted message', message);
  });

  app.service('messages').on('patched', message => {
    console.log('Patched message', message);
  });

  try {
    await app.service('messages').create({
      text: ''
    });
  }
  catch (e) {
    console.log('What is wrong with you? Why are you trying to save an empty message?')
    // Do nothing.
  }

  await app.service('messages').create({
    text: 'This is my first message'
  });

  await app.service('messages').patch(1, {
    text: 'This is my new message, yo'
  })

  const lastMessage = await app.service('messages').create({
    text: 'Second message'
  });

  // Remove the message we just created
  await app.service('messages').remove(lastMessage.id);

  const messageList = await app.service('messages').find();

  console.log('Available messages', messageList);
}

processMessagesSubscribers();
