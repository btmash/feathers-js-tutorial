// Create a websocket connecting to our Feathers server
const socket = io('http://localhost:3030');
// Create a Feathers application
const app = feathers();
// Configure Socket.io client services to use that socket
app.configure(feathers.socketio(socket));

app.service('messages').on('created', message => {
  console.log('Someone created a message', message);
});

async function createAndList() {
  await app.service('messages').create({
    text: 'Hello from Feathers browser client'
  });

  const messages = await app.service('messages').find();

  console.log('Messages', messages);
}

createAndList();
