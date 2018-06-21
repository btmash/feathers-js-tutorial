const app = feathers();

app.use('messages', feathers.memory({
  paginate: {
    default: 10,
    max: 25
  }
}));
